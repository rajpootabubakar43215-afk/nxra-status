// SFTP log ingester for COD 1.1 server (games_mp.log)
// - Connects via SFTP, fetches only NEW bytes since last run
// - Parses kill events (D;) and InitGame lines
// - Updates aggregated player + weapon stats in DB
// Triggered by frontend polling (every ~30s).

import { createClient } from "npm:@supabase/supabase-js@2";
import SftpClient from "npm:ssh2-sftp-client@10.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SFTP_HOST = (Deno.env.get("SFTP_HOST") || "").trim();
const SFTP_PORT = parseInt((Deno.env.get("SFTP_PORT") || "22").trim(), 10);
const SFTP_USER = (Deno.env.get("SFTP_USER") || "").trim();
const SFTP_PASS = (Deno.env.get("SFTP_PASS") || "").replace(/[\r\n]+$/g, "");
const SFTP_LOG_PATH = (Deno.env.get("SFTP_LOG_PATH") || "main/games_mp.log").trim();

const LOG_ID = "games_mp.log";
const MAX_BYTES_PER_RUN = 2 * 1024 * 1024; // 2MB safety cap

// COD color code stripper
const stripCol = (s: string) => s.replace(/\^[0-9]/g, "").trim();

interface ParseCtx {
  currentMap: string | null;
  currentGametype: string | null;
}

interface KillRow {
  attacker: string | null;
  victim: string;
  weapon: string | null;
  mod: string | null;
  hitloc: string | null;
  map: string | null;
  gametype: string | null;
  is_headshot: boolean;
  is_suicide: boolean;
  damage: number;
  is_kill: boolean;
}

function parseInitGame(line: string, ctx: ParseCtx) {
  // " 0:00 InitGame: \g_gametype\sd\...\mapname\mp_harbor\..."
  const idx = line.indexOf("InitGame:");
  if (idx < 0) return;
  const rest = line.slice(idx + 9).trim();
  const parts = rest.split("\\").filter((x) => x.length > 0);
  const map: Record<string, string> = {};
  for (let i = 0; i + 1 < parts.length; i += 2) map[parts[i]] = parts[i + 1];
  if (map.mapname) ctx.currentMap = map.mapname;
  if (map.g_gametype) ctx.currentGametype = map.g_gametype;
}

// COD1 log line formats:
//  D;<vid>;<vteam>;<vname>;<aid>;<ateam>;<aname>;<weapon>;<damage>;<mod>;<hitloc>  (damage event - one per hit)
//  K;<vid>;<vteam>;<vname>;<aid>;<ateam>;<aname>;<weapon>;<damage>;<mod>;<hitloc>  (kill event)
function parseEvent(line: string, ctx: ParseCtx): KillRow | null {
  const dIdx = line.indexOf(" D;");
  const kIdx = line.indexOf(" K;");
  const isKill = kIdx >= 0;
  const idx = isKill ? kIdx : dIdx;
  if (idx < 0) return null;
  const payload = line.slice(idx + 3);
  const f = payload.split(";");
  if (f.length < 10) return null;
  const victim = stripCol(f[2] || "");
  const attacker = stripCol(f[5] || "");
  const weapon = (f[6] || "").trim();
  const damage = parseInt(f[7] || "0", 10) || 0;
  const mod = (f[8] || "").trim();
  const hitloc = (f[9] || "").trim();
  if (!victim) return null;
  const isSuicide = !attacker || attacker === victim || mod === "MOD_SUICIDE" || mod === "MOD_FALLING";
  const isHead = hitloc.toLowerCase() === "head" || mod === "MOD_HEAD_SHOT";
  return {
    attacker: isSuicide ? null : attacker,
    victim,
    weapon: weapon || null,
    mod: mod || null,
    hitloc: hitloc || null,
    map: ctx.currentMap,
    gametype: ctx.currentGametype,
    is_headshot: isHead,
    is_suicide: isSuicide,
    damage,
    is_kill: isKill,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const sftp = new SftpClient();

  try {
    // Get current parse offset
    const { data: state } = await supabase
      .from("log_state")
      .select("*")
      .eq("id", LOG_ID)
      .maybeSingle();

    const lastSize: number = state?.last_size ?? 0;
    const ctx: ParseCtx = {
      currentMap: state?.current_map ?? null,
      currentGametype: state?.current_gametype ?? null,
    };

    await sftp.connect({
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USER,
      password: SFTP_PASS,
      readyTimeout: 15000,
    });

    const stat = await sftp.stat(SFTP_LOG_PATH);
    const fileSize: number = stat.size;

    let startOffset = lastSize;
    // Detect rotation/truncation
    if (fileSize < lastSize) startOffset = 0;
    if (fileSize === lastSize) {
      await sftp.end();
      return new Response(
        JSON.stringify({ ok: true, newBytes: 0, fileSize, message: "no new data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const wantBytes = Math.min(fileSize - startOffset, MAX_BYTES_PER_RUN);
    const endOffset = startOffset + wantBytes;

    // ssh2-sftp-client get with range options
    const buf = (await sftp.get(SFTP_LOG_PATH, undefined, {
      readStreamOptions: { start: startOffset, end: endOffset - 1 },
    })) as Buffer;

    await sftp.end();

    const text = buf.toString("utf-8");
    const lines = text.split(/\r?\n/);

    const events: KillRow[] = [];
    for (const ln of lines) {
      if (!ln) continue;
      if (ln.includes("InitGame:")) parseInitGame(ln, ctx);
      else if (ln.includes(" D;") || ln.includes(" K;")) {
        const e = parseEvent(ln, ctx);
        if (e) events.push(e);
      }
    }

    const kills = events.filter((e) => e.is_kill);

    // Insert raw kill events only (chunked)
    if (kills.length > 0) {
      for (let i = 0; i < kills.length; i += 500) {
        const chunk = kills.slice(i, i + 500).map(({ damage: _d, is_kill: _k, ...rest }) => rest);
        const { error } = await supabase.from("kill_events").insert(chunk);
        if (error) console.error("insert kill_events", error.message);
      }
    }

    // Aggregate in memory
    const playerAgg: Record<string, { kills: number; deaths: number; headshots: number; suicides: number; damage: number; shots: number }> = {};
    const weaponAgg: Record<string, { player_name: string; weapon: string; kills: number; headshots: number }> = {};
    const ensure = (n: string) => {
      if (!playerAgg[n]) playerAgg[n] = { kills: 0, deaths: 0, headshots: 0, suicides: 0, damage: 0, shots: 0 };
      return playerAgg[n];
    };

    // Damage events → per-hit damage + shots landed
    for (const e of events) {
      if (e.is_kill) continue;
      if (e.attacker && !e.is_suicide) {
        const a = ensure(e.attacker);
        a.shots++;
        a.damage += e.damage;
      }
    }

    // Kill events → kills, deaths, headshots, weapon stats
    for (const k of kills) {
      ensure(k.victim).deaths++;
      if (k.is_suicide) ensure(k.victim).suicides++;
      if (k.attacker && !k.is_suicide) {
        const a = ensure(k.attacker);
        a.kills++;
        if (k.is_headshot) a.headshots++;
        if (k.weapon) {
          const key = `${k.attacker}::${k.weapon}`;
          if (!weaponAgg[key])
            weaponAgg[key] = { player_name: k.attacker, weapon: k.weapon, kills: 0, headshots: 0 };
          weaponAgg[key].kills++;
          if (k.is_headshot) weaponAgg[key].headshots++;
        }
      }
    }

    // Upsert players (increment-style: read existing then update)
    const names = Object.keys(playerAgg);
    if (names.length > 0) {
      const { data: existing } = await supabase
        .from("players")
        .select("name,kills,deaths,headshots,suicides,damage,shots")
        .in("name", names);
      const existMap = new Map((existing ?? []).map((p) => [p.name, p]));
      const rows = names.map((n) => {
        const cur = existMap.get(n);
        const add = playerAgg[n];
        return {
          name: n,
          kills: (cur?.kills ?? 0) + add.kills,
          deaths: (cur?.deaths ?? 0) + add.deaths,
          headshots: (cur?.headshots ?? 0) + add.headshots,
          suicides: (cur?.suicides ?? 0) + add.suicides,
          damage: ((cur as any)?.damage ?? 0) + add.damage,
          shots: ((cur as any)?.shots ?? 0) + add.shots,
          last_seen: new Date().toISOString(),
        };
      });
      const { error } = await supabase.from("players").upsert(rows, { onConflict: "name" });
      if (error) console.error("upsert players", error.message);
    }

    // Upsert weapon stats
    const weaponKeys = Object.keys(weaponAgg);
    if (weaponKeys.length > 0) {
      const wNames = [...new Set(weaponKeys.map((k) => weaponAgg[k].player_name))];
      const { data: existingW } = await supabase
        .from("weapon_stats")
        .select("player_name,weapon,kills,headshots")
        .in("player_name", wNames);
      const wExist = new Map(
        (existingW ?? []).map((r) => [`${r.player_name}::${r.weapon}`, r]),
      );
      const wRows = weaponKeys.map((k) => {
        const add = weaponAgg[k];
        const cur = wExist.get(k);
        return {
          player_name: add.player_name,
          weapon: add.weapon,
          kills: (cur?.kills ?? 0) + add.kills,
          headshots: (cur?.headshots ?? 0) + add.headshots,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("weapon_stats")
        .upsert(wRows, { onConflict: "player_name,weapon" });
      if (error) console.error("upsert weapon_stats", error.message);
    }

    // Update log_state
    await supabase
      .from("log_state")
      .upsert({
        id: LOG_ID,
        last_size: endOffset,
        last_parsed_at: new Date().toISOString(),
        current_map: ctx.currentMap,
        current_gametype: ctx.currentGametype,
      });

    return new Response(
      JSON.stringify({
        ok: true,
        fileSize,
        bytesRead: wantBytes,
        kills: kills.length,
        playersUpdated: Object.keys(playerAgg).length,
        currentMap: ctx.currentMap,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ingest error", e);
    try { await sftp.end(); } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

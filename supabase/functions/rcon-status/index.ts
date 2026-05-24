// Live status from log_state (populated by stats-ingest)
// COD1 RCON UDP is blocked in edge runtime, so we surface the
// most recent map/gametype/players from the parsed log instead.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: state } = await supabase
      .from("log_state")
      .select("current_map,current_gametype,last_parsed_at")
      .eq("id", "games_mp.log")
      .maybeSingle();

    // Active players = anyone with a kill_event in the last 5 minutes
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("kill_events")
      .select("attacker,victim,occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(500);

    const seen = new Map<string, { name: string; lastSeen: string; kills: number }>();
    for (const e of recent ?? []) {
      for (const n of [e.attacker, e.victim]) {
        if (!n) continue;
        const cur = seen.get(n);
        if (!cur) seen.set(n, { name: n, lastSeen: e.occurred_at as string, kills: n === e.attacker ? 1 : 0 });
        else if (n === e.attacker) cur.kills++;
      }
    }

    const players = [...seen.values()].sort((a, b) => b.kills - a.kills);

    return new Response(
      JSON.stringify({
        ok: true,
        mapname: state?.current_map ?? "",
        gametype: state?.current_gametype ?? "",
        lastParsedAt: state?.last_parsed_at ?? null,
        playerCount: players.length,
        maxclients: 50,
        players: players.map((p) => ({ name: p.name, score: p.kills, ping: 0 })),
        source: "log",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

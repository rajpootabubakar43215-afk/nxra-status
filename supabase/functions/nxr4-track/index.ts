// Tracks Nxr4 player activity. Called by the frontend on each refresh.
// Fetches the cod1 masterlist, filters Nxr4 servers, and increments per-player sightings.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEED = "https://codservers.net/cod1_servers.json";

function stripCodCodes(s: string) {
  return (s || "").replace(/\^[0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const res = await fetch(FEED, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Feed ${res.status}`);
    const json = await res.json();
    const servers: any[] = Array.isArray(json) ? json : json.servers || [];

    const nxr4 = servers.filter((s) =>
      stripCodCodes(s.hostname || s.sv_hostname || "").toLowerCase().includes("nxr4"),
    );

    type Agg = { display: string; score: number; server: string };
    const agg = new Map<string, Agg>();
    for (const s of nxr4) {
      const host = stripCodCodes(s.hostname || s.sv_hostname || "Nxr4");
      const players: any[] = Array.isArray(s.players) ? s.players : [];
      for (const p of players) {
        const display = (p.name || "").toString();
        const key = stripCodCodes(display).trim().toLowerCase();
        if (!key) continue;
        const score = Number(p.score) || 0;
        const cur = agg.get(key);
        if (cur) {
          cur.score += score;
        } else {
          agg.set(key, { display, score, server: host });
        }
      }
    }

    // Upsert each player: increment sightings by 1, add score
    let tracked = 0;
    for (const [key, v] of agg) {
      const { data: existing } = await supabase
        .from("nxr4_player_activity")
        .select("id, sightings, total_score")
        .eq("player_key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("nxr4_player_activity")
          .update({
            sightings: existing.sightings + 1,
            total_score: (existing.total_score || 0) + v.score,
            display_name: v.display,
            last_server: v.server,
            last_seen: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("nxr4_player_activity").insert({
          player_key: key,
          display_name: v.display,
          sightings: 1,
          total_score: v.score,
          last_server: v.server,
        });
      }
      tracked++;
    }

    return new Response(JSON.stringify({ ok: true, tracked, servers: nxr4.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

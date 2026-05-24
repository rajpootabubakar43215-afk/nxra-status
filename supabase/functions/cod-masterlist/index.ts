const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GAME_TO_FEED: Record<string, string> = {
  cod: "https://codservers.net/cod1_servers.json",
  cod2: "https://codservers.net/cod2_servers.json",
  cod4: "https://codservers.net/cod4_servers.json",
  coduo: "https://codservers.net/coduo_servers.json",
};

interface RawPlayer { name?: string; ping?: number | string; score?: number | string }
interface RawServer {
  country?: string;
  country_code?: string;
  city?: string;
  region?: string;
  game_id?: string;
  gametype?: string;
  hostname?: string;
  ip?: string;
  isp?: string;
  org?: string;
  asn?: string;
  last_updated?: string;
  map?: string;
  maxplayers?: number;
  players?: RawPlayer[];
  port?: number;
  raw_info?: Record<string, string>;
  raw_status?: Record<string, string>;
  version?: string;
}

function adaptServer(s: RawServer, idx: number) {
  const info = s.raw_info || s.raw_status || {};
  const players = Array.isArray(s.players) ? s.players : [];
  const iso = (s.country_code || s.country || "").toUpperCase().slice(0, 2);
  return {
    id: idx + 1,
    ip: s.ip || "",
    port: s.port || 0,
    updated: s.last_updated || "",
    added: "",
    url: info.sv_website || info._Website || info.website || "",
    game: s.game_id || "",
    gameversion: s.version || info.shortversion || "",
    owner: info.sv_owner || info._Admin || info._Owner || info.owner || "",
    clients: players.length,
    bots: 0,
    g_gametype: s.gametype || info.g_gametype || "",
    mapname: s.map || info.mapname || "",
    shortversion: s.version || info.shortversion || "",
    sv_hostname: s.hostname || info.sv_hostname || "",
    sv_maxclients: s.maxplayers || Number(info.sv_maxclients) || 0,
    sv_maxping: Number(info.sv_maxping) || 0,
    fs_game: info.fs_game || "",
    pswrd: Number(info.pswrd) || 0,
    playerinfo: players.map((p) => ({
      name: String(p.name ?? ""),
      ping: String(p.ping ?? ""),
      score: String(p.score ?? "0"),
    })),
    country_isocode: iso,
    country_name: s.country || "",
    city_name: s.city || s.region || "",
    network: s.isp || s.org || "",
    mapimage: "",
    raw_info: info,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Image proxy mode: ?image=<full gametracker url>
    const imageParam = url.searchParams.get("image");
    if (imageParam) {
      try {
        const imgUrl = new URL(imageParam);
        if (imgUrl.hostname !== "image.gametracker.com") {
          return new Response("forbidden host", { status: 403, headers: corsHeaders });
        }
        const imgRes = await fetch(imgUrl.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; lovable-cod-tracker/1.0)",
            Referer: "https://www.gametracker.com/",
            Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          },
        });
        if (!imgRes.ok) {
          return new Response("not found", { status: 404, headers: corsHeaders });
        }
        const buf = await imgRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": imgRes.headers.get("content-type") || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      } catch {
        return new Response("bad image url", { status: 400, headers: corsHeaders });
      }
    }

    const game = (url.searchParams.get("game") || "").trim().toLowerCase();
    const version = (url.searchParams.get("version") || "").trim();

    const feed = GAME_TO_FEED[game];
    if (!feed) {
      return new Response(JSON.stringify({ error: "unsupported game" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = `${feed}?_=${Date.now()}`;
    let lastStatus = 0;
    let lastBody = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const upstream = await fetch(target, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; lovable-cod-tracker/1.0)",
          Referer: "https://codservers.net/",
        },
      });
      lastStatus = upstream.status;
      if (upstream.ok) {
        const raw = await upstream.text();
        let json: { servers?: RawServer[] };
        try {
          json = JSON.parse(raw);
        } catch {
          // Some feeds contain trailing garbage / NaN. Try to recover.
          const cleaned = raw
            .replace(/\bNaN\b/g, "null")
            .replace(/\bInfinity\b/g, "null")
            .replace(/,\s*([}\]])/g, "$1");
          // Try slicing at last closing brace
          const lastBrace = cleaned.lastIndexOf("}");
          const candidate = lastBrace > 0 ? cleaned.slice(0, lastBrace + 1) : cleaned;
          try {
            json = JSON.parse(candidate);
          } catch {
            json = { servers: [] };
          }
        }
        const all: RawServer[] = Array.isArray(json?.servers) ? json.servers : [];
        const filtered = version
          ? all.filter((s) => (s.version || s.raw_info?.shortversion || "") === version)
          : all;
        const adapted = filtered.map(adaptServer);
        const body = {
          description: `retrieved ${adapted.length} servers, game=${game}, shortversion=${version || "all"}`,
          time_retrieved: Math.floor(Date.now() / 1000),
          masterlist_updated: Math.floor(Date.now() / 1000),
          servers: adapted,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=30",
          },
        });
      }
      lastBody = await upstream.text().catch(() => "");
      if (upstream.status !== 503 && upstream.status !== 429) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }

    return new Response(
      JSON.stringify({ error: "upstream_failed", status: lastStatus, body: lastBody.slice(0, 300) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

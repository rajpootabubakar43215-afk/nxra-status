export interface PlayerInfo {
  name: string;
  ping: string;
  score: string;
}

export interface CodServer {
  id: number;
  ip: string;
  port: number;
  updated: string;
  added: string;
  url: string;
  game: string;
  gameversion: string;
  owner: string;
  clients: number;
  bots: number;
  g_gametype: string;
  mapname: string;
  shortversion: string;
  sv_hostname: string;
  sv_maxclients: number;
  sv_maxping: number;
  fs_game: string;
  pswrd: number;
  playerinfo: PlayerInfo[];
  country_isocode: string;
  country_name: string;
  city_name: string;
  network: string;
  mapimage: string;
  raw_info?: Record<string, string>;
}

export interface CodResponse {
  description: string;
  time_retrieved: number;
  masterlist_updated: number;
  servers: CodServer[];
}

export async function fetchMasterlist(game: string, version: string): Promise<CodResponse> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/cod-masterlist?game=${encodeURIComponent(game)}&version=${encodeURIComponent(version)}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Failed after retries");
}

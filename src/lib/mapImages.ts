// Map image URLs. Local assets for known maps, GameTracker (proxied) as fallback.
import cod_mp_carentan from "@/assets/maps/cod/mp_carentan.jpg";
import cod_mp_dawnville from "@/assets/maps/cod/mp_dawnville.jpg";
import cod_mp_depot from "@/assets/maps/cod/mp_depot.jpg";
import cod_mp_harbor from "@/assets/maps/cod/mp_harbor.jpg";
import cod_mp_pavlov from "@/assets/maps/cod/mp_pavlov.jpg";
import cod_mp_rocket from "@/assets/maps/cod/mp_rocket.jpg";
import cod_mp_powcamp from "@/assets/maps/cod/mp_powcamp.jpg";
import cod_zh_king from "@/assets/maps/cod/zh_king.jpg";

import cod2_mp_breakout from "@/assets/maps/cod2/mp_breakout.jpg";
import cod2_mp_burgundy from "@/assets/maps/cod2/mp_burgundy.jpg";
import cod2_mp_decoy from "@/assets/maps/cod2/mp_decoy.jpg";
import cod2_mp_leningrad from "@/assets/maps/cod2/mp_leningrad.jpg";
import cod2_mp_matmata from "@/assets/maps/cod2/mp_matmata.jpg";
import cod2_mp_rhine from "@/assets/maps/cod2/mp_rhine.jpg";
import cod2_mp_toujane from "@/assets/maps/cod2/mp_toujane.jpg";
import cod2_mp_trainstation from "@/assets/maps/cod2/mp_trainstation.jpg";

import cod4_mp_backlot from "@/assets/maps/cod4/mp_backlot.jpg";
import cod4_mp_bloc from "@/assets/maps/cod4/mp_bloc.jpg";
import cod4_mp_bog from "@/assets/maps/cod4/mp_bog.jpg";
import cod4_mp_cargo from "@/assets/maps/cod4/mp_cargo.jpg";
import cod4_mp_citystreets from "@/assets/maps/cod4/mp_citystreets.jpg";
import cod4_mp_convoy from "@/assets/maps/cod4/mp_convoy.jpg";
import cod4_mp_countdown from "@/assets/maps/cod4/mp_countdown.jpg";
import cod4_mp_crash from "@/assets/maps/cod4/mp_crash.jpg";
import cod4_mp_crossfire from "@/assets/maps/cod4/mp_crossfire.jpg";
import cod4_mp_farm from "@/assets/maps/cod4/mp_farm.jpg";

const BASE = "https://image.gametracker.com/images/maps/160x120";

const LOCAL_COD: Record<string, string> = {
  mp_carentan: cod_mp_carentan,
  mp_dawnville: cod_mp_dawnville,
  mp_depot: cod_mp_depot,
  mp_harbor: cod_mp_harbor,
  mp_pavlov: cod_mp_pavlov,
  mp_rocket: cod_mp_rocket,
  mp_powcamp: cod_mp_powcamp,
  zh_king: cod_zh_king,
};

const LOCAL_COD2: Record<string, string> = {
  mp_breakout: cod2_mp_breakout,
  mp_burgundy: cod2_mp_burgundy,
  mp_decoy: cod2_mp_decoy,
  mp_leningrad: cod2_mp_leningrad,
  mp_matmata: cod2_mp_matmata,
  mp_rhine: cod2_mp_rhine,
  mp_toujane: cod2_mp_toujane,
  mp_trainstation: cod2_mp_trainstation,
};

const LOCAL_COD4: Record<string, string> = {
  mp_backlot: cod4_mp_backlot,
  mp_bloc: cod4_mp_bloc,
  mp_bog: cod4_mp_bog,
  mp_cargo: cod4_mp_cargo,
  mp_citystreets: cod4_mp_citystreets,
  mp_convoy: cod4_mp_convoy,
  mp_countdown: cod4_mp_countdown,
  mp_crash: cod4_mp_crash,
  mp_crossfire: cod4_mp_crossfire,
  mp_farm: cod4_mp_farm,
};

const COD_REMOTE_MAPS = [
  "mp_railyard", "rats", "mp_brecourt", "mp_hurtgen",
  "de_dust02", "xp_standoff", "mp_ship", "mp_stalingrad",
];

const CODUO_MAPS = [
  "mp_arnhem", "mp_berlin", "mp_cassino", "mp_foy", "mp_italy",
  "mp_kharkov", "mp_kursk", "mp_rhinevalley", "mp_sicily", "mp_uovilla",
  "mp_uo_carentan", "mp_uo_dawnville", "mp_uo_depot", "mp_uo_harbor",
  "mp_uo_pavlov", "mp_uo_powcamp", "mp_uo_stalingrad",
];

const COD4_MAPS = [
  "mp_convoy", "mp_backlot", "mp_bloc", "mp_bog", "mp_countdown",
  "mp_crash", "mp_crossfire", "mp_citystreets", "mp_farm", "mp_overgrown",
  "mp_pipeline", "mp_shipment", "mp_showdown", "mp_strike", "mp_vacant",
  "mp_cargo", "mp_broadcast", "mp_carentan", "mp_creek", "mp_killhouse",
];

function proxied(originalUrl: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/cod-masterlist?image=${encodeURIComponent(originalUrl)}`;
}

function build(folder: string, names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) out[n.toLowerCase()] = proxied(`${BASE}/${folder}/${n}.jpg`);
  return out;
}

function normalizeGame(game: string): string {
  const key = game.trim().toLowerCase();
  if (key === "cod1") return "cod";
  if (key === "uo" || key === "cod_uo") return "coduo";
  return key;
}

function normalizeMap(mapname: string): string {
  return mapname.trim().toLowerCase();
}

const REMOTE_REGISTRY: Record<string, Record<string, string>> = {
  cod: build("cod", COD_REMOTE_MAPS),
  coduo: { ...build("coduo", CODUO_MAPS), ...build("cod", COD_REMOTE_MAPS) },
  cod2: {},
  cod4: build("cod4", COD4_MAPS),
};

export function getMapImage(game: string, mapname: string): string | null {
  if (!mapname) return null;

  const normalizedGame = normalizeGame(game);
  const key = normalizeMap(mapname);

  if ((normalizedGame === "cod" || normalizedGame === "coduo") && LOCAL_COD[key]) {
    return LOCAL_COD[key];
  }

  if (normalizedGame === "cod2" && LOCAL_COD2[key]) {
    return LOCAL_COD2[key];
  }

  if (normalizedGame === "cod4" && LOCAL_COD4[key]) {
    return LOCAL_COD4[key];
  }

  const reg = REMOTE_REGISTRY[normalizedGame];
  if (reg && reg[key]) return reg[key];

  const folder = normalizedGame === "coduo" ? "coduo" : normalizedGame;
  return proxied(`${BASE}/${folder}/${key}.jpg`);
}

// Detects which client/mod a COD server is running on (cex, iw1x, lc, plutonium, stock, etc.)
import type { CodServer } from "./codApi";

export interface ExtensionInfo {
  label: string;
  color: string; // tailwind text color class
}

export function detectExtension(s: CodServer): ExtensionInfo {
  const raw = s.raw_info || {};
  const haystack = [
    s.shortversion,
    s.gameversion,
    s.fs_game,
    raw._Mod,
    raw.mod,
    raw.gamename,
    raw.protocol,
    raw.shortversion,
    raw.gameversion,
    raw.sv_hostname,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/iw1x/.test(haystack)) return { label: "iw1x", color: "text-neon-purple" };
  if (/cod1x/.test(haystack)) return { label: "cod1x", color: "text-neon-purple" };
  if (/cex|extreme\+/.test(haystack)) return { label: "cex", color: "text-neon-yellow" };
  if (/libcod|\blc\b/.test(haystack)) return { label: "lc", color: "text-cyan" };
  if (/plutonium|\bplu\b/.test(haystack)) return { label: "plu", color: "text-neon-red" };
  if (/xlabs|x-labs/.test(haystack)) return { label: "xlabs", color: "text-neon-blue" };
  if (/iw4x/.test(haystack)) return { label: "iw4x", color: "text-neon-purple" };
  if (/iw5/.test(haystack)) return { label: "iw5", color: "text-neon-purple" };
  if (/cod4x/.test(haystack)) return { label: "cod4x", color: "text-neon-green" };

  // Stock fallback by gameversion
  const v = (s.shortversion || s.gameversion || "").toLowerCase();
  if (v) return { label: v, color: "text-muted-foreground" };
  return { label: "—", color: "text-muted-foreground/60" };
}

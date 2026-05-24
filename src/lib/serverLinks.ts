// Detect URLs and discord invites inside server hostnames / info strings.
import { stripCodCodes } from "./codColor";

const URL_RE = /(https?:\/\/[^\s"'<>]+)|((?:www\.)[^\s"'<>]+)|((?:discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+)/gi;

export interface DetectedLink {
  href: string;
  label: string;
  type: "discord" | "web";
}

export function detectLinks(...sources: (string | undefined | null)[]): DetectedLink[] {
  const found = new Map<string, DetectedLink>();
  for (const raw of sources) {
    if (!raw) continue;
    const text = stripCodCodes(raw);
    const matches = text.match(URL_RE);
    if (!matches) continue;
    for (const m of matches) {
      let label = m.replace(/^https?:\/\//i, "");
      const isDiscord = /discord\.(gg|com)/i.test(m);
      let href = m;
      if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
      if (!found.has(label)) {
        found.set(label, { href, label, type: isDiscord ? "discord" : "web" });
      }
    }
  }
  return Array.from(found.values());
}

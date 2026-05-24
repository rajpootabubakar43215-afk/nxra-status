// COD color code parser - converts ^N color codes to colored spans
// Reference COD palette
const COD_COLORS: Record<string, string> = {
  "0": "#000000",
  "1": "#ff2a2a",
  "2": "#33dd33",
  "3": "#ffe14d",
  "4": "#3a7bff",
  "5": "#33dddd",
  "6": "#ff33cc",
  "7": "#ffffff",
  "8": "#888888",
  "9": "#aaaaaa",
};

export function parseCodString(input: string): Array<{ text: string; color: string }> {
  if (!input) return [{ text: "", color: "#ffffff" }];
  const parts: Array<{ text: string; color: string }> = [];
  let current = "";
  let color = "#ffffff";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "^" && i + 1 < input.length && COD_COLORS[input[i + 1]]) {
      if (current) parts.push({ text: current, color });
      color = COD_COLORS[input[i + 1]];
      current = "";
      i++;
    } else {
      current += ch;
    }
  }
  if (current) parts.push({ text: current, color });
  return parts.length ? parts : [{ text: input, color: "#ffffff" }];
}

export function stripCodCodes(input: string): string {
  if (!input) return "";
  return input.replace(/\^[0-9]/g, "");
}

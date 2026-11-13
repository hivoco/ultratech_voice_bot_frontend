let counter = 0;

/** Short unique id for list keys (crypto.randomUUID is unavailable on plain-http LAN origins). */
export function uid(prefix = "m"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Format seconds as "0:42". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Format seconds as "1 min 48 sec" (or "1 hr 15 min" for long calls). */
export function longDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s / 60);
  if (h > 0) return `${h} hr ${m % 60} min`;
  const rest = String(s % 60).padStart(2, "0");
  return m > 0 ? `${m} min ${rest} sec` : `${s} sec`;
}

/** `lang` for a bubble: "hi" when it has Devanagari, so screen readers use a Hindi voice for it. */
export const textLang = (...parts: (string | undefined)[]) =>
  parts.some((t) => t && /[\u0900-\u097F]/.test(t)) ? "hi" : undefined;

/** Drop markdown marks the model sometimes emits (bold, *emphasis*, headings, `code`); list dashes become "•". */
export function plainText(text: string): string {
  return text
    .replace(/\*\*|__/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[ \t]*[-*][ \t]+/gm, "• ") // "- item" / "* item" lists
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s.,!?;:)]|$)/gm, "$1$2") // *emphasis* / _emphasis_
    .replace(/`([^`\n]+)`/g, "$1"); // `code`
}

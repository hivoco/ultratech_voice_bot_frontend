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

/** Format seconds as "1 min 48 sec". */
export function longDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, "0");
  return m > 0 ? `${m} min ${rest} sec` : `${s} sec`;
}

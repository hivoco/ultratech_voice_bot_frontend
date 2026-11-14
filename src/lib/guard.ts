import "server-only";

// Request hygiene for the public /api/* proxy routes: same-origin check, body size cap,
// safe JSON parsing and a best-effort per-IP rate limit. In production, also add a
// platform rate-limit rule (e.g. Vercel WAF) on /api/voice/token — this in-memory limiter
// is per server instance only.

const MAX_BODY_BYTES = 16 * 1024;
export const USER_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
export const SESSION_ID_RE = /^[0-9a-f]{32}$/;
export const MAX_TEXT_CHARS = 1000;

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Drop expired buckets, then the oldest ones: never wipe everyone's count at once (a flood of
 *  fake keys must not reset the limit for real users). */
function evict(now: number) {
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  for (const k of buckets.keys()) {
    if (buckets.size <= 9_000) break;
    buckets.delete(k);
  }
}

function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    if (buckets.size > 10_000) evict(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

/** Read the body up to the cap, or null if it is larger. A chunked body has no content-length to check. */
async function readCapped(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

const bad = (status: number, detail: string) => Response.json({ detail }, { status });

/**
 * Validate a POST to a proxy route. Returns the parsed JSON object, or a Response to send back.
 * `limit` = max requests per IP per minute for this route; `maxBytes` = body size cap.
 */
export async function guardPost(
  request: Request,
  route: string,
  limit: number,
  maxBytes = MAX_BODY_BYTES,
): Promise<Record<string, unknown> | Response> {
  // Browsers always send Origin on a POST, so a missing one is not our page.
  let originHost = "";
  try {
    originHost = new URL(request.headers.get("origin") ?? "").host;
  } catch {
    /* missing, "null" or malformed origin */
  }
  if (originHost !== request.headers.get("host")) return bad(403, "Cross-origin request blocked");

  // The last x-forwarded-for entry is the one added by our own proxy. Earlier entries come from
  // the client, which could otherwise send a new fake IP each time to dodge the limit.
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || request.headers.get("x-real-ip") || "local";
  if (rateLimited(`${route}:${ip}`, limit, 60_000)) return bad(429, "Too many requests — try again in a minute");

  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return bad(413, "Request too large");
  const raw = await readCapped(request, maxBytes);
  if (raw === null) return bad(413, "Request too large");
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return bad(400, "Expected a JSON object");
    return body as Record<string, unknown>;
  } catch {
    return bad(400, "Invalid JSON");
  }
}

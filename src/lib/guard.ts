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

function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    if (buckets.size > 10_000) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

const bad = (status: number, detail: string) => Response.json({ detail }, { status });

/**
 * Validate a POST to a proxy route. Returns the parsed JSON object, or a Response to send back.
 * `limit` = max requests per IP per minute for this route.
 */
export async function guardPost(request: Request, route: string, limit: number): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* "null" or malformed origin */
    }
    if (originHost !== request.headers.get("host")) return bad(403, "Cross-origin request blocked");
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  if (rateLimited(`${route}:${ip}`, limit, 60_000)) return bad(429, "Too many requests — try again in a minute");

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return bad(413, "Request too large");
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return bad(413, "Request too large");
  try {
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return bad(400, "Expected a JSON object");
    return body as Record<string, unknown>;
  } catch {
    return bad(400, "Invalid JSON");
  }
}

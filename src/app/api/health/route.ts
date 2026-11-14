import { connection } from "next/server";
import { backendFetch } from "@/lib/backend";

// GET /api/health -> {ok} from backend /health (drives the "Online" dot in the header).
// Only `ok` is passed on: the rest of the backend's answer (such as which provider keys are
// missing) is internal and this route is public.
// Always 200: "backend down" is a normal state for the UI, not a page error.
// The answer is cached for 10 s per server instance, so hammering this public route can't turn
// into a flood of backend calls.
const TTL_MS = 10_000;
let cached: { ok: boolean; at: number } | null = null;
let inflight: Promise<boolean> | null = null;

async function check(): Promise<boolean> {
  try {
    const upstream = await backendFetch("/health", { signal: AbortSignal.timeout(5_000) });
    if (!upstream.ok) return false;
    const data = (await upstream.json()) as { ok?: unknown };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function GET() {
  await connection();
  const now = Date.now();
  if (!cached || now - cached.at > TTL_MS) {
    inflight ??= check().finally(() => (inflight = null));
    cached = { ok: await inflight, at: Date.now() };
  }
  return Response.json({ ok: cached.ok });
}

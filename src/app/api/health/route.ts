import { connection } from "next/server";
import { backendFetch } from "@/lib/backend";

// GET /api/health -> {ok} from backend /health (drives the "Online" dot in the header).
// Only `ok` is passed on: the rest of the backend's answer (such as which provider keys are
// missing) is internal and this route is public.
// Always 200: "backend down" is a normal state for the UI, not a page error.
export async function GET() {
  await connection();
  try {
    const upstream = await backendFetch("/health", { signal: AbortSignal.timeout(5_000) });
    if (!upstream.ok) return Response.json({ ok: false });
    const data = (await upstream.json()) as { ok?: unknown };
    return Response.json({ ok: data.ok === true });
  } catch {
    return Response.json({ ok: false });
  }
}

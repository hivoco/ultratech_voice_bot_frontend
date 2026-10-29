import { connection } from "next/server";
import { backendFetch } from "@/lib/backend";

// GET /api/health -> {ok, ...} from backend /health (drives the "Online" dot in the header).
// Always 200: "backend down" is a normal state for the UI, not a page error.
export async function GET() {
  await connection();
  try {
    const upstream = await backendFetch("/health");
    if (!upstream.ok) return Response.json({ ok: false, missing_keys: [], kb_entries: 0 });
    return Response.json(await upstream.json());
  } catch {
    return Response.json({ ok: false, missing_keys: [], kb_entries: 0 });
  }
}

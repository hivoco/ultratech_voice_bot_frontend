import { backendFetch } from "@/lib/backend";
import { guardPost, MAX_TEXT_CHARS, SESSION_ID_RE } from "@/lib/guard";

// POST /api/turn/stream  {session_id, text} -> NDJSON stream (meta / text / audio / done / error)
export async function POST(request: Request) {
  const body = await guardPost(request, "turn", 30);
  if (body instanceof Response) return body;
  const { session_id, text } = body;
  if (typeof session_id !== "string" || !SESSION_ID_RE.test(session_id)) {
    return Response.json({ detail: "Invalid session_id" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_CHARS) {
    return Response.json({ detail: `text must be 1–${MAX_TEXT_CHARS} characters` }, { status: 400 });
  }
  try {
    const upstream = await backendFetch("/turn/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The backend always appends per-sentence TTS audio after the text; the client stops
      // reading at the first "audio" event because text chat only shows the reply text.
      body: JSON.stringify({ session_id, text }),
    });
    if (!upstream.ok || !upstream.body) {
      return Response.json({ detail: `Backend error ${upstream.status}` }, { status: upstream.status === 404 ? 404 : 502 });
    }
    return new Response(upstream.body, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

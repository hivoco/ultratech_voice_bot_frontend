import { backendFetch } from "@/lib/backend";

// POST /api/turn/stream  {session_id, text} -> NDJSON stream (meta / text / done / error)
export async function POST(request: Request) {
  const { session_id, text } = (await request.json()) as { session_id?: string; text?: string };
  if (!session_id || !text?.trim()) {
    return Response.json({ detail: "session_id and text are required" }, { status: 400 });
  }
  try {
    const upstream = await backendFetch("/turn/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Text chat only renders the reply text, so skip the per-sentence TTS audio.
      body: JSON.stringify({ session_id, text, want_audio: false }),
    });
    if (!upstream.ok || !upstream.body) {
      return new Response(await upstream.text(), { status: upstream.status });
    }
    return new Response(upstream.body, {
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

import { backendFetch } from "@/lib/backend";
import { guardPost, MAX_TEXT_CHARS } from "@/lib/guard";
import { STAGES, type Stage } from "@/lib/types";

// POST /api/voice/photo  {image_b64, caption?, stage?, lang?, room?} -> {reply, serious, condition, query}
// A photo taken during a voice call: the backend classifies it and writes the spoken reply; the
// browser then relays it to the voice worker on the "voice_photo" data topic so the bot says it.
const MAX_BODY = 4 * 1024 * 1024;
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const ROOM_RE = /^[A-Za-z0-9_-]{1,80}$/;
const TIMEOUT_MS = 60_000;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: Request) {
  const body = await guardPost(request, "voice-photo", 6, MAX_BODY);
  if (body instanceof Response) return body;
  const { image_b64, caption, stage, lang, room } = body;
  if (typeof image_b64 !== "string" || image_b64.length < 100 || !B64_RE.test(image_b64)) {
    return Response.json({ detail: "Invalid image" }, { status: 400 });
  }
  if (caption !== undefined && (typeof caption !== "string" || caption.length > MAX_TEXT_CHARS)) {
    return Response.json({ detail: "Invalid caption" }, { status: 400 });
  }
  try {
    const upstream = await backendFetch("/voice/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_b64,
        caption: typeof caption === "string" ? caption : "",
        lang: lang === "en" ? "en" : "hi", // the voice speaks en or hi (Hinglish is spoken as hi)
        mime: "image/jpeg",
        ...(STAGES.includes(stage as Stage) ? { stage } : {}),
        ...(typeof room === "string" && ROOM_RE.test(room) ? { room } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      if (upstream.status >= 500) console.error(`[backend] /voice/photo returned ${upstream.status}: ${raw.slice(0, 500)}`);
      return Response.json({ detail: "Couldn't check the photo" }, { status: 502 });
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    return Response.json({
      reply: str(data.reply, 2000),
      serious: data.serious === true,
      condition: str(data.condition, 60),
      query: str(data.query, 500),
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

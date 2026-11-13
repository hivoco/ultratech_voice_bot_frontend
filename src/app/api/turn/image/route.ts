import { backendFetch } from "@/lib/backend";
import { guardPost, MAX_TEXT_CHARS, SESSION_ID_RE } from "@/lib/guard";

// POST /api/turn/image  {session_id, image_b64, caption?, mime?, lang?} -> {text, key_points, serious, condition}
// A photo in the text chat: the backend classifies it (Jev) and the Expert answers on it.
// Photos are downscaled in the browser (≤1280 px JPEG, usually 150–400 KB), so 4 MB is plenty.
const LANGS = new Set(["en", "hi", "hinglish"]);
const MIMES = new Set(["image/jpeg", "image/png"]);
const MAX_BODY = 4 * 1024 * 1024;
const B64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const TIMEOUT_MS = 60_000;

export async function POST(request: Request) {
  const body = await guardPost(request, "turn-image", 10, MAX_BODY);
  if (body instanceof Response) return body;
  const { session_id, image_b64, caption, mime, lang } = body;
  if (typeof session_id !== "string" || !SESSION_ID_RE.test(session_id)) {
    return Response.json({ detail: "Invalid session_id" }, { status: 400 });
  }
  if (typeof image_b64 !== "string" || image_b64.length < 100 || !B64_RE.test(image_b64)) {
    return Response.json({ detail: "Invalid image" }, { status: 400 });
  }
  if (caption !== undefined && (typeof caption !== "string" || caption.length > MAX_TEXT_CHARS)) {
    return Response.json({ detail: "Invalid caption" }, { status: 400 });
  }
  try {
    const upstream = await backendFetch("/turn/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        image_b64,
        caption: typeof caption === "string" ? caption : "",
        mime: typeof mime === "string" && MIMES.has(mime) ? mime : "image/jpeg",
        want_audio: false,
        ...(typeof lang === "string" && LANGS.has(lang) ? { lang } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      if (upstream.status >= 500) console.error(`[backend] /turn/image returned ${upstream.status}: ${raw.slice(0, 500)}`);
      return Response.json({ detail: "Couldn't check the photo" }, { status: upstream.status === 404 ? 404 : 502 });
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    const keyPoints = Array.isArray(data.key_points)
      ? data.key_points.filter((k): k is string => typeof k === "string" && !!k.trim()).slice(0, 6).map((k) => k.slice(0, 200))
      : [];
    return Response.json({
      text: typeof data.text === "string" ? data.text : "",
      key_points: keyPoints,
      serious: data.serious === true,
      condition: typeof data.image_condition === "string" ? data.image_condition.slice(0, 60) : "",
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

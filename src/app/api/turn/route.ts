import { backendFetch } from "@/lib/backend";
import { guardPost, MAX_TEXT_CHARS, SESSION_ID_RE } from "@/lib/guard";
import { stringList } from "@/lib/id";
import { capUi, parseUiAnswers } from "@/lib/replyUi";
import { parseContact } from "@/lib/contact";

// POST /api/turn  {session_id, text, lang?, answers?} -> {text, key_points, suggested_questions, serious, ui, contact}
// Typed chat. Non-streaming on purpose: `/turn` returns the reply in the right script for the
// picked language (Roman for Hinglish; the stream sends Devanagari deltas first) plus the key
// points, and with `want_audio: false` the backend skips TTS (the stream always synthesizes it).
const LANGS = new Set(["en", "hi", "hinglish"]);
const TIMEOUT_MS = 45_000;

export async function POST(request: Request) {
  const body = await guardPost(request, "turn", 30);
  if (body instanceof Response) return body;
  const { session_id, text, lang } = body;
  const answers = parseUiAnswers(body.answers);
  if (typeof session_id !== "string" || !SESSION_ID_RE.test(session_id)) {
    return Response.json({ detail: "Invalid session_id" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_TEXT_CHARS) {
    return Response.json({ detail: `text must be 1–${MAX_TEXT_CHARS} characters` }, { status: 400 });
  }
  try {
    const upstream = await backendFetch("/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id,
        text,
        want_audio: false,
        ...(typeof lang === "string" && LANGS.has(lang) ? { lang } : {}),
        // The user's picks on a choice/quiz card (text also carries them, for a backend that ignores this).
        ...(answers ? { answers } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      if (upstream.status >= 500) console.error(`[backend] /turn returned ${upstream.status}: ${raw.slice(0, 500)}`);
      return Response.json({ detail: "Couldn't get an answer" }, { status: upstream.status === 404 ? 404 : 502 });
    }
    const data = JSON.parse(raw) as Record<string, unknown>;
    // Only what the chat shows; kb_items, timings and the rest stay server-side.
    return Response.json({
      text: typeof data.text === "string" ? data.text : "",
      key_points: stringList(data.key_points),
      // Not sent by the backend yet (docs/backend-fixes.md item 5); used instead of key_points once it is.
      suggested_questions: stringList(data.suggested_questions, 3),
      serious: data.serious === true,
      // Optional rich layout (docs/backend-fixes.md item 13); null = plain answer.
      ui: capUi(data.ui),
      // How to reach a human expert when serious (validated channels only; may be empty).
      contact: parseContact(data.contact),
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

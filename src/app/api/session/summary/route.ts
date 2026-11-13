import { backendFetch } from "@/lib/backend";
import { guardPost } from "@/lib/guard";

// POST /api/session/summary  {room, lang, transcript:[{caller, bot}]} -> {summary, lang, turns, pdf_url}
// Each call runs a paid Sarvam summary, so it is tightly limited. The transcript can be long,
// so this route allows a bigger body than the others.

const ROOM_RE = /^[A-Za-z0-9_-]{8,80}$/;
const MAX_TURNS = 120;
const MAX_TURN_CHARS = 4000;
const MAX_BODY = 512 * 1024;
const TIMEOUT_MS = 60_000;

interface Turn {
  caller: string;
  bot: string;
}

function cleanTranscript(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_TURNS) return null;
  const out: Turn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") return null;
    const { caller, bot } = t as Record<string, unknown>;
    if (typeof caller !== "string" || typeof bot !== "string") return null;
    if (caller.length > MAX_TURN_CHARS || bot.length > MAX_TURN_CHARS) return null;
    if (caller.trim() || bot.trim()) out.push({ caller: caller.trim(), bot: bot.trim() });
  }
  return out.length ? out : null;
}

export async function POST(request: Request) {
  const body = await guardPost(request, "summary", 5, MAX_BODY);
  if (body instanceof Response) return body;
  const { room, lang } = body;
  if (typeof room !== "string" || !ROOM_RE.test(room)) {
    return Response.json({ detail: "Invalid room" }, { status: 400 });
  }
  const transcript = cleanTranscript(body.transcript);
  if (!transcript) return Response.json({ detail: "Invalid transcript" }, { status: 400 });

  try {
    const upstream = await backendFetch("/session/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `ui_lang` lets the backend write a Hinglish chat's PDF in Roman (docs/backend-fixes.md item 8);
      // `lang` stays en/hi for today's backend, which ignores unknown fields.
      body: JSON.stringify({
        room,
        lang: lang === "en" ? "en" : "hi",
        ...(body.ui_lang === "en" || body.ui_lang === "hi" || body.ui_lang === "hinglish" ? { ui_lang: body.ui_lang } : {}),
        transcript,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error(`[backend] /session/summary returned ${upstream.status}: ${text.slice(0, 500)}`);
      return Response.json({ detail: "Couldn't prepare the summary" }, { status: upstream.status === 404 ? 404 : 502 });
    }
    const data = JSON.parse(text) as Record<string, unknown>;
    // Only relay an https link (the S3 presigned URL); it's null until the backend has S3 configured.
    const link = typeof data.s3_link === "string" && data.s3_link.startsWith("https://") ? data.s3_link : null;
    return Response.json({
      summary: typeof data.summary === "string" ? data.summary : "",
      lang: data.lang === "en" ? "en" : "hi",
      turns: typeof data.turns === "number" ? data.turns : transcript.length,
      pdf_url: link,
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

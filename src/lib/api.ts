// Browser-side calls to our own /api/* proxy routes (see src/app/api).
import type { UiAnswers } from "./replyUi";
import type { ContactChannels } from "./contact";

export interface VoiceToken {
  url: string;
  token: string;
  room: string;
}

export interface Health {
  ok: boolean;
}

/** A typed answer: the reply text (already in the picked language's script) and its key points. */
export interface TurnReply {
  text: string;
  /** Retired by the backend (always []); kept as a fallback for older backends. */
  key_points: string[];
  /** Follow-up questions the user may ask next (preferred over key_points). */
  suggested_questions?: string[];
  serious: boolean;
  /** Raw backend layout; validate with `parseReplyUi` before use. */
  ui?: unknown;
  contact?: ContactChannels & { name?: string; role?: string };
}

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body.detail === "string" ? body.detail : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as T;
}

export const fetchVoiceToken = (user_uuid: string, lang: "en" | "hi", opts?: { stage?: string; uiLang?: string }) =>
  postJson<VoiceToken>("/api/voice/token", {
    user_uuid,
    lang,
    ...(opts?.stage ? { stage: opts.stage } : {}),
    ...(opts?.uiLang ? { ui_lang: opts.uiLang } : {}),
  });

/** `stage` makes the AI stage-aware from the first turn (backend `set_profile`). */
export const createSession = (user_uuid: string, stage?: string) =>
  postJson<{ session_id: string }>("/api/session", stage ? { user_uuid, stage } : { user_uuid });

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as Health;
}

/** A photo answer: like a typed one, plus `serious` (show the site-engineer card) and the condition. */
export interface ImageReply extends TurnReply {
  condition: string;
}

/** POST a chat photo (data URL from the camera) with an optional caption. */
export function askImageTurn(session_id: string, photo: string, caption: string, lang?: string) {
  const [head, data = ""] = photo.split(",", 2);
  const mime = head.includes("image/png") ? "image/png" : "image/jpeg";
  return postJson<ImageReply>("/api/turn/image", { session_id, image_b64: data, caption, mime, ...(lang ? { lang } : {}) });
}

/** The backend's spoken reply to a photo taken during a call (relayed to the worker on "voice_photo"). */
export interface VoicePhotoReply {
  reply: string;
  serious: boolean;
  condition: string;
  query: string;
}

export function sendVoicePhoto(photo: string, opts: { caption: string; lang: "en" | "hi"; stage?: string; room?: string }) {
  const data = photo.split(",", 2)[1] ?? "";
  return postJson<VoicePhotoReply>("/api/voice/photo", { image_b64: data, ...opts });
}

/** POST a typed question. `lang` ("en" | "hi" | "hinglish") picks the reply's language and script. */
export const askTurn = (session_id: string, text: string, lang?: string, answers?: UiAnswers) =>
  postJson<TurnReply>("/api/turn", { session_id, text, ...(lang ? { lang } : {}), ...(answers ? { answers } : {}) });

export interface TranscriptTurn {
  caller: string;
  bot: string;
}

export interface ConversationSummary {
  summary: string;
  /** "hinglish" = the summary is in Roman script. */
  lang: "en" | "hi" | "hinglish";
  turns: number;
  /** Backend-made PDF (S3 presigned link), or null when the backend has no S3 configured. */
  pdf_url: string | null;
}

export const fetchSummary = (room: string, lang: "en" | "hi", transcript: TranscriptTurn[], uiLang?: string) =>
  postJson<ConversationSummary>("/api/session/summary", { room, lang, transcript, ...(uiLang ? { ui_lang: uiLang } : {}) });

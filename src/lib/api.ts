// Browser-side calls to our own /api/* proxy routes (see src/app/api).

export interface VoiceToken {
  url: string;
  token: string;
  room: string;
}

export interface Health {
  ok: boolean;
}

export type StreamEvent =
  | { type: "meta"; transcript: string; mode: string }
  | { type: "text"; delta: string }
  | { type: "audio" | "full_audio"; idx?: number }
  | { type: "done"; text: string }
  | { type: "error"; detail: string };

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string };
    return body.detail ?? `HTTP ${res.status}`;
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

export const fetchVoiceToken = (user_uuid: string, lang: "en" | "hi") =>
  postJson<VoiceToken>("/api/voice/token", { user_uuid, lang });

export const createSession = (user_uuid: string) =>
  postJson<{ session_id: string }>("/api/session", { user_uuid });

export async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as Health;
}

/** POST a typed question and yield NDJSON events as the reply streams in. */
export async function* streamTurn(session_id: string, text: string): AsyncGenerator<StreamEvent> {
  const res = await fetch("/api/turn/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, text }),
  });
  if (!res.ok || !res.body) throw new Error(await errorDetail(res));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      // A malformed line is skipped, not fatal: the rest of the answer still arrives.
      let ev: unknown;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      if (ev && typeof ev === "object" && typeof (ev as { type?: unknown }).type === "string") yield ev as StreamEvent;
    }
  }
}

export interface TranscriptTurn {
  caller: string;
  bot: string;
}

export interface ConversationSummary {
  summary: string;
  lang: "en" | "hi";
  turns: number;
  /** Backend-made PDF (S3 presigned link), or null when the backend has no S3 configured. */
  pdf_url: string | null;
}

export const fetchSummary = (room: string, lang: "en" | "hi", transcript: TranscriptTurn[]) =>
  postJson<ConversationSummary>("/api/session/summary", { room, lang, transcript });

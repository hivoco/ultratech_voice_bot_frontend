/**
 * Rich reply layouts the backend can attach to a chat answer (`ui` on `/turn` and `/turn/image`).
 * Contract for the backend: docs/backend-fixes.md item 13. The API route only size-caps the raw object
 * (`capUi`); the browser validates it with `parseReplyUi` right before use, so a malformed layout
 * can never reach a component (it falls back to the plain answer).
 *
 *  - none        plain answer (+ suggested questions): no `ui` field
 *  - "choice"    one multiple-choice question, the user taps one option
 *  - "quiz"      a few questions one after another (1 / 3 progress), single or multi-select each
 *  - "facts"     highlighted metrics (label → value) + titled checklists
 */

export interface UiQuestion {
  id: string;
  question: string;
  options: string[];
  /** Multi-select (checkboxes + Next); otherwise a tap picks and moves on. */
  multiple: boolean;
}

export type ReplyUi =
  | { type: "choice"; id: string; question: UiQuestion; photoPrompt?: string }
  | { type: "quiz"; id: string; questions: UiQuestion[]; photoPrompt?: string }
  | {
      type: "facts";
      metrics: { label: string; value: string }[];
      sections: { title: string; items: string[] }[];
    };

/** What the user picked, sent back with the next turn as `answers`. */
export interface UiAnswers {
  ui_id: string;
  items: { id: string; question: string; answer: string[] }[];
}

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function strs(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

function id(v: unknown, fallback: string): string {
  return typeof v === "string" && ID_RE.test(v) ? v : fallback;
}

function question(v: unknown, i: number): UiQuestion | null {
  if (!v || typeof v !== "object") return null;
  const q = v as Record<string, unknown>;
  const text = str(q.question, 140);
  // Dedupe: React keys and "which one was picked" rely on unique labels.
  const options = [...new Set(strs(q.options, 6, 90))];
  if (!text || options.length < 2) return null;
  return { id: id(q.id, `q${i + 1}`), question: text, options, multiple: q.multiple === true };
}

/** Validates `ui` from the backend. Anything unknown or malformed → null (the plain answer still shows). */
export function parseReplyUi(v: unknown): ReplyUi | null {
  if (!v || typeof v !== "object") return null;
  const u = v as Record<string, unknown>;
  const photoPrompt = str(u.photo_prompt, 120) || undefined;
  switch (u.type) {
    case "choice": {
      const q = question(u, 0);
      return q ? { type: "choice", id: id(u.id, "choice"), question: q, photoPrompt } : null;
    }
    case "quiz": {
      const questions = (Array.isArray(u.questions) ? u.questions : [])
        .slice(0, 5)
        .map(question)
        .filter((q): q is UiQuestion => q !== null);
      return questions.length ? { type: "quiz", id: id(u.id, "quiz"), questions, photoPrompt } : null;
    }
    case "facts": {
      const metrics = (Array.isArray(u.metrics) ? u.metrics : [])
        .map((m) => (m && typeof m === "object" ? (m as Record<string, unknown>) : {}))
        .map((m) => ({ label: str(m.label, 40), value: str(m.value, 40) }))
        .filter((m) => m.label && m.value)
        .slice(0, 6);
      const sections = (Array.isArray(u.sections) ? u.sections : [])
        .map((s) => (s && typeof s === "object" ? (s as Record<string, unknown>) : {}))
        .map((s) => ({ title: str(s.title, 60), items: strs(s.items, 6, 160) }))
        .filter((s) => s.items.length)
        .slice(0, 3);
      return metrics.length || sections.length ? { type: "facts", metrics, sections } : null;
    }
    default:
      return null;
  }
}

/** Server side: pass the backend's raw `ui` through only if it's a reasonably small object. */
export function capUi(v: unknown): unknown {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  try {
    return JSON.stringify(v).length <= 16_000 ? v : null;
  } catch {
    return null;
  }
}

/** Validates `answers` coming from the browser before it goes to the backend. */
export function parseUiAnswers(v: unknown): UiAnswers | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (typeof a.ui_id !== "string" || !ID_RE.test(a.ui_id) || !Array.isArray(a.items)) return null;
  const items = a.items
    .slice(0, 5)
    .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
    .filter((x) => typeof x.id === "string" && ID_RE.test(x.id))
    .map((x) => ({ id: x.id as string, question: str(x.question, 140), answer: strs(x.answer, 6, 90) }))
    .filter((x) => x.answer.length);
  return items.length ? { ui_id: a.ui_id, items } : null;
}

/** The questions a choice/quiz asks, in order. */
export function uiQuestions(ui: ReplyUi): UiQuestion[] {
  return ui.type === "choice" ? [ui.question] : ui.type === "quiz" ? ui.questions : [];
}

/**
 * The user's message for their answers (what the bubble shows and `/turn` gets as `text`): just the
 * option for a single question, "Question — answer" lines for a quiz, so a backend that ignores
 * `answers` still understands the reply.
 */
export function answersText(ui: ReplyUi, answers: UiAnswers): string {
  if (ui.type === "choice") return answers.items[0]?.answer.join(", ") ?? "";
  return answers.items.map((a) => `${a.question} — ${a.answer.join(", ")}`).join("\n");
}

/** Plain-text version of a layout for the PDF transcript (the bubble's text alone would drop it). */
export function uiPlainText(ui: ReplyUi): string {
  if (ui.type === "facts") {
    return [
      ...ui.metrics.map((m) => `${m.label}: ${m.value}`),
      ...ui.sections.flatMap((s) => [...(s.title ? [s.title] : []), ...s.items.map((i) => `• ${i}`)]),
    ].join("\n");
  }
  return uiQuestions(ui)
    .map((q) => q.question)
    .join("\n");
}

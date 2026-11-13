import type { ReplyUi, UiAnswers } from "./replyUi";

export type LangChoice = "en" | "hi" | "hinglish";
export type Stage = "Plot" | "Plan" | "Foundation" | "Structure" | "Plaster" | "Finishing";
export type Screen = "language" | "chat" | "voice" | "camera" | "wrapup";

export interface Profile {
  uuid: string;
  lang?: LangChoice;
  stage?: Stage;
}

export type OptionKind = "lang" | "stage";

export interface ExpertContact {
  name: string;
  role: string;
  callSlot?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  /** https link to book a site visit / request a callback. */
  bookingUrl?: string;
  /** What to do meanwhile, shown on the card (always set for escalations, so a card without
   *  contact channels still says something useful instead of showing dead buttons). */
  note?: string;
}

export type ChatMessage =
  | {
      id: string;
      kind: "engineer";
      /** Regular-weight lead line (e.g. "Great, I'll talk with you in English."). */
      lead?: string;
      /** Semibold prompt line (e.g. "Which stage is your home at right now?"). */
      prompt?: string;
      /** Body text of an answer (transcript style). */
      text?: string;
      /** Tappable follow-ups under a typed answer (from suggested_questions, else key_points). */
      suggestions?: Suggestions;
      /** Rich layout from the backend's `ui` (question card, quiz, facts). */
      ui?: ReplyUi;
      /** The user's picks once a choice/quiz was sent (card turns read-only). */
      uiAnswers?: UiAnswers;
      /** "UltraTech Engineer · 0:42" meta row for spoken answers. */
      voiceMeta?: string;
      options?: OptionKind;
      streaming?: boolean;
      error?: boolean;
      /** Question to resend from the error bubble's "Try again". */
      retryText?: string;
      /** Photo to resend with it (a failed photo turn). */
      retryPhoto?: string;
      /** Quiz answers to resend with it. */
      retryAnswers?: UiAnswers;
    }
  | { id: string; kind: "user"; text: string; photo?: string; photoLabel?: string }
  | { id: string; kind: "divider"; text: string }
  | { id: string; kind: "video"; url: string; title: string }
  /** "Get your conversation summary (PDF)" card, shown when a chat or call ends. */
  | { id: string; kind: "summary"; turns: number }
  | ({ id: string; kind: "expert" } & ExpertContact);

/** Server-side backend language: Hindi and Hinglish both use the Hinglish-speaking "hi" voice. */
export function backendLang(lang: LangChoice | undefined): "en" | "hi" {
  return lang === "en" ? "en" : "hi";
}

export const LANG_LABEL: Record<LangChoice, string> = {
  en: "English",
  hi: "हिंदी",
  hinglish: "Hinglish",
};

export const STAGES: Stage[] = ["Plot", "Plan", "Foundation", "Structure", "Plaster", "Finishing"];

/** Suggested follow-ups under an answer: heading in the chat's language, and per button the label and what a tap sends. */
export interface Suggestions {
  title: string;
  items: { label: string; send: string }[];
}

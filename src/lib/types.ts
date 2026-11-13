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
      /** Short takeaways under a typed answer (the yellow key-points card). */
      keyPoints?: string[];
      /** Card title in the chat's language ("Key points" / "मुख्य बातें" / "Mukhya baatein"). */
      keyPointsTitle?: string;
      /** "UltraTech Engineer · 0:42" meta row for spoken answers. */
      voiceMeta?: string;
      options?: OptionKind;
      streaming?: boolean;
      error?: boolean;
      /** Question to resend from the error bubble's "Try again". */
      retryText?: string;
      /** Photo to resend with it (a failed photo turn). */
      retryPhoto?: string;
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

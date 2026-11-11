import type { TranscriptTurn } from "./api";
import type { ChatMessage } from "./types";

/**
 * Pair the chat (typed answers and call transcripts) into caller → engineer turns.
 * Onboarding prompts, errors, dividers and cards are left out.
 */
export function buildTranscript(messages: ChatMessage[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  let caller = "";
  for (const m of messages) {
    if (m.kind === "user") {
      caller = caller ? `${caller} ${m.text}` : m.text;
    } else if (m.kind === "engineer") {
      if (m.text && !m.error && !m.streaming) turns.push({ caller, bot: m.text });
      // A prompt-only bubble (name / language / stage question) ends an onboarding exchange.
      caller = "";
    }
  }
  return turns.filter((t) => t.caller.trim() && t.bot.trim());
}

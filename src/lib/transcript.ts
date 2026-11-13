import type { TranscriptTurn } from "./api";
import { plainText } from "./id";
import { uiPlainText } from "./replyUi";
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
      // Same plain text the bubble shows: the PDF would print "**", "*" and "`" marks as-is.
      // A facts / question card goes into the PDF too, as plain lines under the answer.
      if (m.text && !m.error && !m.streaming) {
        turns.push({ caller, bot: [plainText(m.text), m.ui ? uiPlainText(m.ui) : ""].filter(Boolean).join("\n") });
      }
      // A prompt-only bubble (language / stage question) ends an onboarding exchange.
      caller = "";
    }
  }
  return turns.filter((t) => t.caller.trim() && t.bot.trim());
}

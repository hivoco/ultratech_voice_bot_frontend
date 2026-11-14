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

const MAX_TURNS = 120;
const MAX_SIDE_CHARS = 4000;
/** ~120k characters stays under the summary route's 512 KB body cap even in 3-byte Devanagari. */
const MAX_TOTAL_CHARS = 120_000;

/**
 * The transcript as sent for the summary: newest turns first within the route's limits (≤120
 * turns, ≤4000 characters per side, ~120k in total), so a long chat still gets its PDF instead
 * of a rejected request.
 */
export function fitTranscript(turns: TranscriptTurn[]): TranscriptTurn[] {
  const cut = (s: string) => (s.length > MAX_SIDE_CHARS ? `${s.slice(0, MAX_SIDE_CHARS - 1)}…` : s);
  const out: TranscriptTurn[] = [];
  let total = 0;
  for (let i = turns.length - 1; i >= 0 && out.length < MAX_TURNS; i--) {
    const t = { caller: cut(turns[i].caller), bot: cut(turns[i].bot) };
    total += t.caller.length + t.bot.length;
    if (total > MAX_TOTAL_CHARS && out.length) break;
    out.push(t);
  }
  return out.reverse();
}

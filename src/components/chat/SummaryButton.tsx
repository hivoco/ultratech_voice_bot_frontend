"use client";

import { motion } from "motion/react";
import { useConversationSummary } from "@/lib/useConversationSummary";

/**
 * Yellow "Get your conversation summary (PDF)" button; prepares the summary as soon as it mounts.
 * `turns` pins it to the conversation as it was when the card appeared, so later questions don't
 * trigger another paid summary from a card higher up the chat.
 */
export function SummaryButton({ secondary = false, turns }: { secondary?: boolean; turns?: number }) {
  const { query, download } = useConversationSummary(turns);
  const busy = query.isFetching;
  return (
    <motion.button
      type="button"
      onClick={query.isError ? () => void query.refetch() : download}
      disabled={busy}
      aria-busy={busy}
      whileTap={{ scale: 0.98 }}
      className={`flex h-[50px] w-full items-center justify-center gap-2 px-4 text-[15px] font-[590] disabled:opacity-80 ${
        secondary ? "rounded-[18px] bg-white/16 text-white" : "rounded-[16px] bg-brand text-ink"
      }`}
    >
      {busy ? (
        <>
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current/25 border-t-current" />
          Preparing your summary…
        </>
      ) : query.isError ? (
        "Couldn't prepare the PDF · Try again"
      ) : (
        <>
          <PdfGlyph />
          Get your conversation summary (PDF)
        </>
      )}
    </motion.button>
  );
}

function PdfGlyph() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 11v6m0 0-2.5-2.5M12 17l2.5-2.5" />
    </svg>
  );
}

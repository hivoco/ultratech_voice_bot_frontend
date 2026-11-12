"use client";

import { motion } from "motion/react";
import { useApp } from "@/lib/store";
import { buildTranscript } from "@/lib/transcript";
import { Header, HeaderMenu } from "../ui/Header";
import { SummaryButton } from "../chat/SummaryButton";

/** 06 · Wrap-up — Thank you. */
export function WrapUpScreen() {
  const { goTo, restart, state } = useApp();
  const hasTurns = buildTranscript(state.messages).length > 0;
  return (
    <>
      <Header
        onBack={() => goTo("chat")}
        backLabel="Back to conversation"
        trailing={<HeaderMenu items={[{ label: "Back to conversation", run: () => goTo("chat") }]} />}
      />
      <div className="flex min-h-0 flex-1 items-center px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-[29px] text-pretty text-[24px] leading-[29px] font-bold text-ink"
        >
          <p>I hope your home-building questions have been answered. If anything else comes up, just ask.</p>
          <p>Thank you.</p>
        </motion.div>
      </div>
      {/* Two yellow buttons side by side (v5 06 · Wrap-up). */}
      <div className="mx-4 flex shrink-0 gap-3 pb-[max(32px,env(safe-area-inset-bottom))]">
        {hasTurns && (
          <motion.div className="min-w-0 flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <SummaryButton compact />
          </motion.div>
        )}
        <motion.button
          type="button"
          onClick={restart}
          whileTap={{ scale: 0.98 }}
          className="flex h-[50px] min-w-0 flex-1 items-center justify-center rounded-[18px] bg-brand px-3 text-[15px] transition-colors hover:bg-brand-hover font-[590] text-ink"
        >
          End conversation
        </motion.button>
      </div>
    </>
  );
}

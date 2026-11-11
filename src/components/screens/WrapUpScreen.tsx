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
          className="text-glow space-y-[29px] text-[24px] leading-[29px] font-bold text-white"
        >
          <p>I hope your home-building questions have been answered. If anything else comes up, just ask.</p>
          <p>Thank you.</p>
        </motion.div>
      </div>
      <div className="mx-4 shrink-0 space-y-3 pb-[max(32px,env(safe-area-inset-bottom))]">
        {hasTurns && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <SummaryButton secondary />
          </motion.div>
        )}
        <motion.button
          type="button"
          onClick={restart}
          whileTap={{ scale: 0.98 }}
          className="flex h-[50px] w-full items-center justify-center rounded-[18px] bg-brand text-[15px] font-[590] text-ink"
        >
          End conversation
        </motion.button>
      </div>
    </>
  );
}

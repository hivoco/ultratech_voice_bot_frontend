"use client";

import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { backendLang } from "@/lib/types";
import { turnText } from "@/lib/useVoiceCall";
import { Header } from "../ui/Header";
import { Icon } from "../ui/Icon";
import { VoiceControls } from "../voice/VoiceControls";
import { VoiceOrb, type OrbMode } from "../voice/VoiceOrb";

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

const ERROR_COPY = {
  mic: {
    title: "Couldn't hear you",
    body: "Allow microphone access for this site (lock icon in the address bar), then try again.",
  },
  connect: {
    title: "Couldn't connect",
    body: "The engineer is not reachable right now. Check your internet and try again.",
  },
  dropped: {
    title: "Couldn't hear that clearly",
    body: "If the site is noisy, hold the phone a little closer and try again.",
  },
} as const;

/** 02 listening · 02b thinking · 02c speaking · 02d couldn't hear. */
export function VoiceScreen() {
  const { voice, state, endVoice, openCamera } = useApp();
  const { status, phase, lastTurn, lastUserTurn, lastAgentTurn } = voice;

  const errored = status === "error";
  const userTurnIsLatest = lastTurn && lastTurn === lastUserTurn;
  const user = lastUserTurn ? turnText(lastUserTurn) : null;
  const agent = lastAgentTurn ? turnText(lastAgentTurn) : null;
  const question = user ? [user.final, user.interim].filter(Boolean).join(" ") : "";

  const orbMode: OrbMode = errored || !voice.micEnabled ? "muted" : phase === "thinking" ? "thinking" : phase === "speaking" ? "speaking" : "listening";
  const userTalking = phase === "listening" && !!userTurnIsLatest && !!user?.interim;

  const retry = () => void voice.start(backendLang(state.profile.lang));

  let hint = "";
  if (phase === "thinking") hint = "Thinking about your question…";
  else if (phase === "speaking") hint = "Tap the orb if you want to interrupt";
  else if (status === "live" && !voice.micEnabled) hint = "Microphone is muted";

  return (
    <>
      <Header onBack={() => void endVoice()} backLabel="End voice chat" action="keyboard" onKeyboard={() => void endVoice()} />

      <section className="relative min-h-[150px] shrink-0 px-6 pt-[34px]" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {errored ? (
            <motion.div key="error" {...fade}>
              <h2 className="text-glow text-[32px] leading-[38px] font-bold text-white">{ERROR_COPY[voice.errorKind ?? "dropped"].title}</h2>
              <p className="text-glow mt-2 text-[18px] leading-[25px] text-white/70">{ERROR_COPY[voice.errorKind ?? "dropped"].body}</p>
            </motion.div>
          ) : phase === "speaking" ? (
            <motion.div key="speaking" {...fade} className="-mt-3">
              {question && (
                <>
                  <p className="text-glow text-[13px] leading-4 font-[510] text-white opacity-60">You asked</p>
                  <p className="text-glow mt-0.5 line-clamp-2 text-[16px] leading-[22px] font-[510] text-white/75">{question}</p>
                </>
              )}
              <p className="mt-4 flex max-h-[186px] flex-col justify-end overflow-hidden text-[23px] leading-[31px] font-bold text-white [mask-image:linear-gradient(to_bottom,transparent,#000_32px)]">
                <span>
                  {agent?.final}{" "}
                  <span className="text-white/35">{agent?.interim}</span>
                </span>
              </p>
            </motion.div>
          ) : phase === "connecting" ? (
            <motion.h2 key="connecting" {...fade} className="text-glow text-[32px] leading-[38px] font-bold text-white">
              Connecting you to <span className="text-white/55">the UltraTech Engineer…</span>
            </motion.h2>
          ) : userTurnIsLatest && question ? (
            <motion.h2 key="question" {...fade} className="text-glow text-[32px] leading-[38px] font-bold text-white">
              {phase === "thinking" ? (
                question
              ) : (
                <>
                  {user?.final} <span className="text-white/55">{user?.interim}</span>
                </>
              )}
            </motion.h2>
          ) : (
            <motion.h2 key="idle" {...fade} className="text-glow text-[32px] leading-[38px] font-bold text-white">
              I&apos;m listening. <span className="text-white/55">Ask anything about building your home.</span>
            </motion.h2>
          )}
        </AnimatePresence>
      </section>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 pb-2">
        <VoiceOrb
          mode={orbMode}
          active={phase === "speaking" || userTalking}
          onClick={phase === "speaking" ? () => void voice.interrupt() : undefined}
          label={phase === "speaking" ? "Interrupt the engineer" : "Voice assistant status"}
        />
        <div className="flex min-h-[37px] items-center">
          <AnimatePresence mode="wait">
            {errored ? (
              <motion.div key="retry" {...fade} className="flex gap-2.5">
                <button
                  type="button"
                  onClick={retry}
                  className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[14px] font-[590] text-ink transition-transform active:scale-95"
                >
                  <Icon src="/icons/retry.svg" size={16} />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => void endVoice()}
                  className="flex items-center gap-1.5 rounded-full bg-white/16 px-4 py-2.5 text-[14px] font-[590] text-white transition-transform active:scale-95"
                >
                  <Icon src="/icons/keyboard-small.svg" size={16} />
                  Type instead
                </button>
              </motion.div>
            ) : hint ? (
              <motion.p
                key={hint}
                {...fade}
                className={phase === "thinking" ? "text-[14px] text-white/80" : "text-[13px] text-white/70"}
              >
                {hint}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <VoiceControls
        micEnabled={voice.micEnabled || errored}
        onCamera={openCamera}
        onMic={() => (errored ? retry() : void voice.toggleMic())}
        onClose={() => void endVoice()}
      />
    </>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { plainText } from "@/lib/id";
import { useApp } from "@/lib/store";
import { backendLang } from "@/lib/types";
import { turnText } from "@/lib/useVoiceCall";
import { Header, KeyboardButton } from "../ui/Header";
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

const PHASE_ANNOUNCE = {
  connecting: "Connecting to the UltraTech Engineer",
  listening: "Listening",
  thinking: "Thinking about your question",
  speaking: "The engineer is answering",
} as const;

// Big status text; smaller on narrow screens (a phone at 200% zoom is ~215 px wide).
const HEADING = "text-balance text-[32px] leading-[38px] font-bold text-ink max-[300px]:text-[24px] max-[300px]:leading-[30px]";

// The live question: same size as the answer, so long speech stays readable and doesn't jump between states.
const LIVE_TEXT = "text-pretty text-[23px] leading-[31px] font-bold text-ink max-[300px]:text-[19px] max-[300px]:leading-[26px]";

const ORB_LABEL: Record<OrbMode, string> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  muted: "Microphone off",
};

/** 02 listening · 02b thinking · 02c speaking · 02d couldn't hear. */
export function VoiceScreen() {
  const { voice, state, endVoice, openCamera } = useApp();
  const { status, phase, lastTurn, lastUserTurn, lastAgentTurn } = voice;

  const errored = status === "error";
  const userTurnIsLatest = lastTurn && lastTurn === lastUserTurn;
  const user = lastUserTurn ? turnText(lastUserTurn) : null;
  const agent = lastAgentTurn ? turnText(lastAgentTurn) : null;
  const question = user ? [user.final, user.interim].filter(Boolean).join(" ") : "";
  const showQuestion = !errored && phase !== "speaking" && phase !== "connecting" && !!userTurnIsLatest && !!question;

  const orbMode: OrbMode = errored || !voice.micEnabled ? "muted" : phase === "thinking" ? "thinking" : phase === "speaking" ? "speaking" : "listening";
  const userTalking = phase === "listening" && !!userTurnIsLatest && !!user?.interim;

  const retry = () => void voice.start(backendLang(state.profile.lang));

  let hint = "";
  if (phase === "thinking") hint = "Thinking about your question…";
  // v5 "Orb · Listening": the caption under the orb while the mic is open.
  else if (phase === "listening" && status === "live" && voice.micEnabled) hint = "Listening… speak naturally";
  else if (phase === "speaking") hint = "Tap the orb if you want to interrupt";
  else if (status === "live" && !voice.micEnabled) hint = "Microphone is muted";

  return (
    <>
      <Header
        onBack={() => void endVoice()}
        backLabel="End voice chat"
        trailing={<KeyboardButton onClick={() => void endVoice()} />}
      />

      {/* Screen-reader announcements: phase changes only, never the live transcript. */}
      <p role="status" className="sr-only">
        {errored ? "" : PHASE_ANNOUNCE[phase]}
      </p>

      <TextArea
        follow={!errored && (phase === "speaking" || showQuestion)}
        resetKey={errored ? "error" : `${phase}-${lastTurn?.id ?? ""}`}
        className="min-h-[150px] px-6 pt-[34px] pb-2 short:min-h-[120px] short:pt-4 tiny:min-h-0 tiny:pt-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          {errored ? (
            <motion.div key="error" {...fade} role="alert">
              <h2 className={HEADING}>{ERROR_COPY[voice.errorKind ?? "dropped"].title}</h2>
              <p className="mt-2 text-[18px] leading-[25px] text-muted max-[300px]:text-[15px] max-[300px]:leading-[21px]">
                {ERROR_COPY[voice.errorKind ?? "dropped"].body}
              </p>
            </motion.div>
          ) : phase === "speaking" ? (
            <motion.div key="speaking" {...fade}>
              {question && (
                <>
                  <p className="text-[13px] leading-4 font-[510] text-muted">You asked</p>
                  <p className="mt-0.5 line-clamp-2 text-[16px] short:line-clamp-1 leading-[22px] font-[510] text-ink-2">{question}</p>
                </>
              )}
              <p className="mt-4 text-[23px] leading-[31px] font-bold text-ink tiny:mt-2 max-[300px]:text-[19px] max-[300px]:leading-[26px]">
                {plainText([agent?.final, agent?.interim].filter(Boolean).join(" "))}
              </p>
            </motion.div>
          ) : phase === "connecting" ? (
            <motion.h2 key="connecting" {...fade} className={HEADING}>
              Connecting you to <span className="text-muted-2">the UltraTech Engineer…</span>
            </motion.h2>
          ) : showQuestion ? (
            <motion.h2 key="question" {...fade} className={LIVE_TEXT}>
              {phase === "thinking" ? (
                question
              ) : (
                <>
                  {user?.final} <span className="text-muted-2">{user?.interim}</span>
                </>
              )}
            </motion.h2>
          ) : (
            <motion.h2 key="idle" {...fade} className={HEADING}>
              I&apos;m listening. <span className="text-muted-2">Ask anything about building your home.</span>
            </motion.h2>
          )}
        </AnimatePresence>
      </TextArea>

      <div className="flex flex-[1_0_0] flex-col items-center justify-center gap-2 pb-2 short:gap-1">
        {/* The text area and this block split the free height evenly, whatever the text length (see TextArea),
            and the orb is sized by screen height only: the orb, hint and controls stay put in every state. On the smallest screens the error screen drops it (only a status picture there), and
            phones held sideways drop it in every state so the text stays readable. */}
        <div className={`flex h-[240px] w-full items-center justify-center short:h-[158px] tiny:h-[99px] flat:hidden ${errored ? "tiny:hidden" : ""}`}>
          <div className="short:scale-[0.72] tiny:scale-[0.45]">
            <VoiceOrb
              mode={orbMode}
              active={phase === "speaking" || userTalking}
              onClick={phase === "speaking" ? () => void voice.interrupt() : undefined}
              label={phase === "speaking" ? "Interrupt the engineer" : ORB_LABEL[orbMode]}
            />
          </div>
        </div>
        <div className="flex min-h-[37px] items-center justify-center px-4 text-center">
          <AnimatePresence mode="wait">
            {errored ? (
              <motion.div key="retry" {...fade} className="flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={retry}
                  className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[14px] font-[590] text-ink transition-[background-color,transform] hover:bg-brand-hover active:scale-95"
                >
                  <Icon src="/icons/retry.svg" size={16} />
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => void endVoice()}
                  className="flex items-center gap-1.5 rounded-full border border-line-2 bg-paper px-4 py-2.5 text-[14px] font-[590] text-ink transition-[background-color,transform] hover:bg-sand active:scale-95"
                >
                  <Icon src="/icons/keyboard-small.svg" size={16} />
                  Type instead
                </button>
              </motion.div>
            ) : hint ? (
              <motion.p
                key={hint}
                {...fade}
                className={phase === "speaking" ? "text-[13px] text-[#484435]" : "text-[14px] text-[#484435]"}
              >
                {phase === "speaking" ? (
                  // Without the orb (phones held sideways) talking over the engineer interrupts it.
                  <>
                    <span className="flat:hidden">{hint}</span>
                    <span className="hidden flat:inline">Start talking to interrupt</span>
                  </>
                ) : (
                  hint
                )}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <VoiceControls
        micEnabled={voice.micEnabled || errored}
        micLabel={errored ? "Try again" : undefined}
        onCamera={openCamera}
        onMic={() => (errored ? retry() : void voice.toggleMic())}
        onClose={() => void endVoice("chat", { summary: true })}
      />
    </>
  );
}

/**
 * The status / transcript text. Its height never depends on the text (flex-basis 0), so long text scrolls
 * here instead of pushing the orb down. While `follow` is on (a live transcript) it stays on the newest line, unless the user scrolls up
 * to read; scrolling back to the bottom follows again. A new turn or state starts over.
 */
function TextArea({ follow, resetKey, className, children }: { follow: boolean; resetKey: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const followRef = useRef(follow);
  const [moreAbove, setMoreAbove] = useState(false);
  const [moreBelow, setMoreBelow] = useState(false);
  const [scrollable, setScrollable] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (pinned.current) el.scrollTop = followRef.current ? el.scrollHeight : 0;
    setMoreAbove(el.scrollTop > 1);
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    setScrollable(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useLayoutEffect(() => {
    followRef.current = follow;
    pinned.current = true;
    sync();
  }, [follow, resetKey, sync]);

  // Text arrives word by word and enters with an animation: follow every size change.
  useEffect(() => {
    const ro = new ResizeObserver(sync);
    if (ref.current) ro.observe(ref.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [sync]);

  return (
    <section
      ref={ref}
      // A scrollable region must be reachable by keyboard.
      tabIndex={scrollable ? 0 : undefined}
      aria-label={scrollable ? "Conversation text" : undefined}
      onScroll={() => {
        const el = ref.current;
        if (!el) return;
        const atEnd = followRef.current ? el.scrollHeight - el.scrollTop - el.clientHeight < 8 : el.scrollTop < 8;
        pinned.current = atEnd;
        setMoreAbove(el.scrollTop > 1);
        setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
      }}
      className={`no-scrollbar relative flex-[1_1_0] overflow-y-auto overscroll-contain wrap-anywhere focus-visible:outline-offset-[-2px] ${
        moreAbove && moreBelow
          ? "[mask-image:linear-gradient(to_bottom,transparent,#000_32px,#000_calc(100%-32px),transparent)]"
          : moreAbove
            ? "[mask-image:linear-gradient(to_bottom,transparent,#000_32px)]"
            : moreBelow
              ? "[mask-image:linear-gradient(to_top,transparent,#000_32px)]"
              : ""
      } ${className}`}
    >
      <div ref={contentRef}>{children}</div>
    </section>
  );
}

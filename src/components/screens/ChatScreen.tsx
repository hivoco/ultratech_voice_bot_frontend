"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GREETING_ID, GREETING_LANG_ID, useApp } from "@/lib/store";
import { LANG_LABEL, STAGES, type ChatMessage, type LangChoice, type Stage } from "@/lib/types";
import { Header, HeaderMenu, type MenuItem } from "../ui/Header";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import { DurationChip, EngineerBubble, ExpertCard, SummaryCard, UserBubble, VideoCard } from "../chat/Bubbles";
import { Composer } from "../chat/Composer";

const LANG_OPTIONS: LangChoice[] = ["en", "hi", "hinglish"];
const PHOTO_RE = /\bphoto\b/i;

/** 01 Welcome (onboarding) and 03b/04b/05b transcript — one scrolling conversation. */
export function ChatScreen() {
  const { state, chooseLang, chooseStage, goTo, submitText, sending, changeLanguage, startVoice, endChat, restart } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, profile } = state;

  // One backward pass: newest option bubble of each kind (only those stay interactive) and the
  // newest engineer message (drives the camera "tap hint").
  let lastLangIdx = -1;
  let lastStageIdx = -1;
  let lastEngineer: Extract<ChatMessage, { kind: "engineer" }> | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.kind !== "engineer") continue;
    lastEngineer ??= m;
    if (m.options === "lang" && lastLangIdx < 0) lastLangIdx = i;
    if (m.options === "stage" && lastStageIdx < 0) lastStageIdx = i;
  }
  const suggestPhoto = PHOTO_RE.test(lastEngineer?.text ?? "");
  const streaming = lastEngineer?.streaming ?? false;

  const lastMessage = messages.at(-1);
  const scrollKey = `${messages.length}:${lastMessage?.kind === "engineer" ? (lastMessage.text?.length ?? 0) : 0}`;
  // Follow new messages only while the reader is at the bottom (or just sent one); someone who
  // scrolled up to re-read isn't yanked down, and gets the "jump to latest" button instead.
  const [atBottom, setAtBottom] = useState(true);
  const lastTopRef = useRef(0);
  const seenCountRef = useRef(messages.length);

  function scrollToLatest() {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
    setAtBottom(true);
  }

  useEffect(() => {
    // A send adds the question and the reply placeholder together, so check every new message.
    const sentNow = messages.slice(seenCountRef.current).some((m) => m.kind === "user");
    seenCountRef.current = messages.length;
    if (!atBottom && !sentNow) return;
    scrollToLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow content changes only, not scroll state
  }, [scrollKey]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Only a scroll *up* counts as leaving the bottom: our own smooth scroll only moves down, so a
    // tall new message doesn't flash the button while it scrolls into view.
    if (fromBottom < 80) setAtBottom(true);
    else if (el.scrollTop < lastTopRef.current - 2) setAtBottom(false);
    lastTopRef.current = el.scrollTop;
  }

  const menu: MenuItem[] = state.ended
    ? [{ label: "Start a new chat", run: restart }]
    : [
        ...(profile.lang ? [{ label: "Change language", run: changeLanguage }] : []),
        { label: "Talk by voice", run: startVoice },
        { label: "End chat", run: endChat },
      ];

  return (
    <>
      <Header onBack={() => goTo("wrapup")} backLabel="Finish conversation" trailing={<HeaderMenu items={menu} />} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main
          ref={scrollRef}
          onScroll={onScroll}
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[18px] pb-4 [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-14px),transparent)]"
        >
          <div
            role="log"
            aria-label="Conversation"
            aria-relevant="additions"
            aria-busy={streaming}
            lang={profile.lang === "hi" ? "hi" : undefined}
            className="flex flex-col gap-3"
          >
            {messages.map((m, idx) => (
              <MessageRow
                key={m.id}
                m={m}
                // Only what each row needs, so a streamed chunk re-renders just the streaming bubble.
                optionsActive={
                  m.kind === "engineer" &&
                  ((m.options === "lang" && idx === lastLangIdx) || (m.options === "stage" && idx === lastStageIdx && idx === messages.length - 1))
                }
                selected={m.kind === "engineer" ? (m.options === "lang" ? profile.lang : m.options === "stage" ? profile.stage : undefined) : undefined}
                sending={m.kind === "engineer" && m.error ? sending : false}
                onLang={chooseLang}
                onStage={chooseStage}
                // Only on the newest message: once the question was retried (or the chat moved on), the old
                // error bubble keeps its text but loses the button, so a second tap can't send it twice.
                onRetry={m.kind === "engineer" && m.error && idx === messages.length - 1 ? submitText : undefined}
              />
            ))}
          </div>
        </main>
        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              onClick={scrollToLatest}
              aria-label="Jump to the latest message"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.16 }}
              whileTap={{ scale: 0.92 }}
              className="absolute bottom-3 left-1/2 z-10 -ml-[22px] grid size-11 place-items-center rounded-full border border-line bg-paper text-ink shadow-[0_6px_20px_rgb(140_110_20/0.2)]"
            >
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m0 0-6-6m6 6 6-6" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <Composer highlightCamera={suggestPhoto} />
    </>
  );
}

interface MessageRowProps {
  m: ChatMessage;
  /** The newest option bubble of its kind (older ones are read-only). */
  optionsActive: boolean;
  /** Current choice, for option bubbles only. */
  selected?: string;
  sending: boolean;
  onLang: (lang: LangChoice) => void;
  onStage: (stage: Stage) => void;
  onRetry?: (text: string) => void;
}

const MessageRow = memo(function MessageRow({ m, optionsActive, selected, sending, onLang, onStage, onRetry }: MessageRowProps) {
  switch (m.kind) {
    case "engineer":
      return (
        <EngineerBubble
          animateIn={m.id !== GREETING_ID && m.id !== GREETING_LANG_ID}
          lead={m.lead}
          prompt={m.prompt}
          text={m.text}
          voiceMeta={m.voiceMeta}
          streaming={m.streaming}
        >
          {m.options === "lang" && (
            <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Language">
              {LANG_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={LANG_LABEL[opt]}
                  lang={opt === "hi" ? "hi" : undefined}
                  selected={selected === opt}
                  disabled={!optionsActive}
                  onClick={() => onLang(opt)}
                />
              ))}
            </div>
          )}
          {m.options === "stage" && (
            <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Home stage">
              {STAGES.map((stage) => (
                <Chip
                  key={stage}
                  label={stage}
                  selected={selected === stage}
                  disabled={!optionsActive}
                  onClick={() => onStage(stage)}
                />
              ))}
            </div>
          )}
          {m.error && m.retryText && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(m.retryText!)}
              disabled={sending}
              className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-[590] text-ink transition-[background-color,transform] enabled:hover:bg-brand-hover active:scale-95 disabled:opacity-50"
            >
              <Icon src="/icons/retry.svg" size={16} />
              Try again
            </button>
          )}
        </EngineerBubble>
      );
    case "user":
      return <UserBubble text={m.text} photo={m.photo} photoLabel={m.photoLabel} />;
    case "divider":
      return <DurationChip text={m.text} />;
    case "video":
      return <VideoCard url={m.url} title={m.title} />;
    case "expert":
      return <ExpertCard name={m.name} role={m.role} callSlot={m.callSlot} phone={m.phone} />;
    case "summary":
      return <SummaryCard turns={m.turns} />;
  }
});

"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GREETING_ID, GREETING_LANG_ID, quizLabelsFor, useApp } from "@/lib/store";
import { PHOTOS_ENABLED } from "@/lib/features";
import type { UiAnswers } from "@/lib/replyUi";
import { LANG_LABEL, STAGES, type ChatMessage, type LangChoice, type Stage } from "@/lib/types";
import { Header, HeaderMenu, type MenuItem } from "../ui/Header";
import { Icon } from "../ui/Icon";
import { DurationChip, EngineerBubble, ExpertCard, SummaryCard, Suggestions, UserBubble, VideoCard } from "../chat/Bubbles";
import { Composer } from "../chat/Composer";
import { FactsCard, QuestionCard, type QuizLabels } from "../chat/ReplyBlocks";
import { RowBoundary } from "../chat/RowBoundary";
import { OptionChips } from "../chat/OptionChips";
import { playSfx, setSoundOn, soundOn } from "@/lib/sfx";

const LANG_OPTIONS: LangChoice[] = ["en", "hi", "hinglish"];
const PHOTO_RE = /\bphoto\b/i;

/** 01 Welcome (onboarding) and 03b/04b/05b transcript — one scrolling conversation. */
export function ChatScreen() {
  const { state, chooseLang, chooseStage, goTo, submitText, answerUi, openCamera, sending, changeLanguage, startVoice, endChat, restart } = useApp();
  const quizLabels = quizLabelsFor(state.profile.lang);
  const [sound, setSound] = useState(true);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved preference after hydration
  useEffect(() => setSound(soundOn()), []);
  const pickLang = useCallback((l: LangChoice) => {
    playSfx("select");
    chooseLang(l);
  }, [chooseLang]);
  const pickStage = useCallback((s: Stage) => {
    playSfx("select");
    chooseStage(s);
  }, [chooseStage]);
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
        // Same rule as the composer: voice opens once language and stage are picked.
        ...(profile.lang && profile.stage ? [{ label: "Talk by voice", run: startVoice }] : []),
        {
          label: sound ? "Sound: on" : "Sound: off",
          run: () => {
            setSoundOn(!sound);
            setSound(!sound);
          },
        },
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
            className="flex flex-col gap-3"
          >
            {messages.map((m, idx) => (
              // One bad message (unexpected data) replaces only its own row, never the whole chat.
              <RowBoundary key={m.id}>
              <MessageRow
                m={m}
                // Only what each row needs, so a streamed chunk re-renders just the streaming bubble.
                optionsActive={
                  !state.ended &&
                  m.kind === "engineer" &&
                  ((m.options === "lang" && idx === lastLangIdx) || (m.options === "stage" && idx === lastStageIdx && idx === messages.length - 1))
                }
                selected={m.kind === "engineer" ? (m.options === "lang" ? profile.lang : m.options === "stage" ? profile.stage : undefined) : undefined}
                sending={m.kind === "engineer" && m.error ? sending : false}
                onLang={pickLang}
                onStage={pickStage}
                // Only on the newest message: once the question was retried (or the chat moved on), the old
                // error bubble keeps its text but loses the button, so a second tap can't send it twice.
                onRetry={m.kind === "engineer" && m.error && idx === messages.length - 1 ? submitText : undefined}
                // Suggested questions and question cards are tappable on the newest answer only, while nothing is in flight.
                suggestionsActive={m === lastEngineer && !sending && !state.ended}
                onAsk={submitText}
                onAnswer={answerUi}
                onPhoto={openCamera}
                quizLabels={quizLabels}
              />
              </RowBoundary>
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
  onRetry?: (text: string, photo?: string, answers?: UiAnswers) => void;
  /** The newest answer, nothing sending: its suggested questions can be tapped. */
  suggestionsActive: boolean;
  onAsk: (text: string) => void;
  onAnswer: (messageId: string, answers: UiAnswers) => void;
  onPhoto: () => void;
  quizLabels: QuizLabels;
}

const MessageRow = memo(function MessageRow({ m, optionsActive, selected, sending, onLang, onStage, onRetry, suggestionsActive, onAsk, onAnswer, onPhoto, quizLabels }: MessageRowProps) {
  switch (m.kind) {
    case "engineer":
      return (
        <>
          <EngineerBubble
            animateIn={m.id !== GREETING_ID}
            // Scripted onboarding lines "type" first (the greeting paints at once for LCP); AI answers
            // already show typing dots while the request runs.
            typeFirst={m.id === GREETING_ID || m.text !== undefined ? 0 : m.id === GREETING_LANG_ID ? 1100 : 750}
            typeKey={m.id}
            waiting={!!m.options && optionsActive && !selected}
            lead={m.lead}
            prompt={m.prompt}
            text={m.text}
            voiceMeta={m.voiceMeta}
            streaming={m.streaming}
          >
            {m.options === "lang" && (
              <OptionChips
                label="Language"
                options={LANG_OPTIONS}
                labelOf={(o) => LANG_LABEL[o]}
                langOf={(o) => (o === "hi" ? "hi" : undefined)}
                selected={selected}
                disabled={!optionsActive}
                waiting={optionsActive && !selected}
                onPick={onLang}
              />
            )}
            {m.options === "stage" && (
              <OptionChips label="Home stage" options={STAGES} labelOf={(o) => o} selected={selected} disabled={!optionsActive} waiting={optionsActive && !selected} onPick={onStage} />
            )}
            {m.error && m.retryText && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(m.retryText!, m.retryPhoto, m.retryAnswers)}
                disabled={sending}
                className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-[590] text-ink transition-[background-color,transform] enabled:hover:bg-brand-hover active:scale-95 disabled:opacity-50"
              >
                <Icon src="/icons/retry.svg" size={16} />
                Try again
              </button>
            )}
            {/* Rich layouts from the backend's `ui` (docs/backend-fixes.md item 13). */}
            {!m.error && !m.streaming && (m.ui?.type === "choice" || m.ui?.type === "quiz") && (
              <QuestionCard
                ui={m.ui}
                active={suggestionsActive}
                answered={m.uiAnswers}
                labels={quizLabels}
                photoEnabled={PHOTOS_ENABLED}
                onSubmit={(a) => onAnswer(m.id, a)}
                onPhoto={onPhoto}
              />
            )}
            {!m.error && !m.streaming && m.ui?.type === "facts" && <FactsCard ui={m.ui} />}
            {/* Tappable follow-ups (suggested_questions, else key_points); a tap sends the next message. */}
            {!m.error && !m.streaming && m.suggestions && (
              <Suggestions title={m.suggestions.title} items={m.suggestions.items} active={suggestionsActive} onPick={onAsk} />
            )}
          </EngineerBubble>
        </>
      );
    case "user":
      return <UserBubble text={m.text} photo={m.photo} photoLabel={m.photoLabel} />;
    case "divider":
      return <DurationChip text={m.text} />;
    case "video":
      return <VideoCard url={m.url} title={m.title} />;
    case "expert":
      return <ExpertCard {...m} />;
    case "summary":
      return <SummaryCard turns={m.turns} />;
  }
});

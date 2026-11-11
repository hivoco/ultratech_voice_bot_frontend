"use client";

import { memo, useEffect, useRef } from "react";
import { GREETING_ID, useApp } from "@/lib/store";
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
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [scrollKey]);

  const menu: MenuItem[] = state.ended
    ? [{ label: "Start a new chat", run: restart }]
    : [
        // Not before the name is known: the language reply goes on to greet the user by name.
        ...(profile.lang && profile.name ? [{ label: "Change language", run: changeLanguage }] : []),
        { label: "Talk by voice", run: startVoice },
        { label: "End chat", run: endChat },
      ];

  return (
    <>
      <Header onBack={() => goTo("wrapup")} backLabel="Finish conversation" trailing={<HeaderMenu items={menu} />} />
      <main
        ref={scrollRef}
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
                ((m.options === "lang" && idx === lastLangIdx) || (m.options === "stage" && idx === lastStageIdx && !profile.stage))
              }
              selected={m.kind === "engineer" ? (m.options === "lang" ? profile.lang : m.options === "stage" ? profile.stage : undefined) : undefined}
              sending={m.kind === "engineer" && m.error ? sending : false}
              onLang={chooseLang}
              onStage={chooseStage}
              onRetry={m.kind === "engineer" && m.error ? submitText : undefined}
            />
          ))}
        </div>
      </main>
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
          animateIn={m.id !== GREETING_ID}
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
              className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-[13px] font-[590] text-ink transition-transform active:scale-95 disabled:opacity-50"
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

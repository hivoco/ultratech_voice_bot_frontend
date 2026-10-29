"use client";

import { useEffect, useRef } from "react";
import { GREETING_ID, useApp } from "@/lib/store";
import { LANG_LABEL, STAGES, type ChatMessage, type LangChoice } from "@/lib/types";
import { Header, HeaderMenu, type MenuItem } from "../ui/Header";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";
import { DurationChip, EngineerBubble, ExpertCard, UserBubble, VideoCard } from "../chat/Bubbles";
import { Composer } from "../chat/Composer";

const LANG_OPTIONS: (LangChoice | "more")[] = ["en", "hi", "hinglish", "more"];
const PHOTO_RE = /\bphoto\b/i;

/** 01 Welcome (onboarding) and 03b/04b/05b transcript — one scrolling conversation. */
export function ChatScreen() {
  const { state, chooseLang, chooseStage, goTo, submitText, sending, changeLanguage, startVoice, endConversation } =
    useApp();
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

  const menu: MenuItem[] = [
    ...(profile.lang ? [{ label: "Change language", run: changeLanguage }] : []),
    { label: "Talk by voice", run: startVoice },
    { label: "End conversation", run: endConversation },
  ];

  function renderMessage(m: ChatMessage, idx: number) {
    switch (m.kind) {
      case "engineer":
        return (
          <EngineerBubble
            key={m.id}
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
                    label={opt === "more" ? "More" : LANG_LABEL[opt]}
                    lang={opt === "hi" ? "hi" : undefined}
                    selected={opt !== "more" && profile.lang === opt}
                    disabled={idx !== lastLangIdx}
                    onClick={() => chooseLang(opt)}
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
                    selected={profile.stage === stage}
                    disabled={idx !== lastStageIdx || !!profile.stage}
                    onClick={() => chooseStage(stage)}
                  />
                ))}
              </div>
            )}
            {m.error && m.retryText && (
              <button
                type="button"
                onClick={() => submitText(m.retryText!)}
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
        return <UserBubble key={m.id} text={m.text} photo={m.photo} photoLabel={m.photoLabel} />;
      case "divider":
        return <DurationChip key={m.id} text={m.text} />;
      case "video":
        return <VideoCard key={m.id} url={m.url} title={m.title} />;
      case "expert":
        return <ExpertCard key={m.id} name={m.name} role={m.role} callSlot={m.callSlot} phone={m.phone} />;
    }
  }

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
          {messages.map(renderMessage)}
        </div>
      </main>
      <Composer highlightCamera={suggestPhoto} />
    </>
  );
}

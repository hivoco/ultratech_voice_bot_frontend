"use client";

import { useEffect, useRef } from "react";
import { GREETING_ID, useApp } from "@/lib/store";
import { LANG_LABEL, STAGES, type ChatMessage, type LangChoice } from "@/lib/types";
import { Header } from "../ui/Header";
import { Chip } from "../ui/Chip";
import { DurationChip, EngineerBubble, ExpertCard, UserBubble, VideoCard } from "../chat/Bubbles";
import { Composer } from "../chat/Composer";

const LANG_OPTIONS: (LangChoice | "more")[] = ["en", "hi", "hinglish", "more"];

/** 01 Welcome (onboarding) and 03b/04b/05b transcript — one scrolling conversation. */
export function ChatScreen() {
  const { state, chooseLang, chooseStage, goTo } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, profile } = state;

  // Only the newest option bubble of each kind stays interactive.
  const lastLangIdx = messages.findLastIndex((m) => m.kind === "engineer" && m.options === "lang");
  const lastStageIdx = messages.findLastIndex((m) => m.kind === "engineer" && m.options === "stage");
  const lastEngineer = messages.findLast((m) => m.kind === "engineer");
  const suggestPhoto = lastEngineer?.kind === "engineer" && /\bphoto\b/i.test(lastEngineer.text ?? "");

  const lastMessage = messages.at(-1);
  const scrollKey = `${messages.length}:${lastMessage?.kind === "engineer" ? (lastMessage.text?.length ?? 0) : 0}`;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [scrollKey]);

  function renderMessage(m: ChatMessage, idx: number) {
    switch (m.kind) {
      case "engineer":
        return (
          <EngineerBubble key={m.id} animateIn={m.id !== GREETING_ID} lead={m.lead} prompt={m.prompt} text={m.text} voiceMeta={m.voiceMeta} streaming={m.streaming}>
            {m.options === "lang" && (
              <div className="flex w-full flex-wrap gap-2">
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
              <div className="flex w-full flex-wrap gap-2">
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
      <Header onBack={() => goTo("wrapup")} backLabel="Finish conversation" action="more" />
      <main
        ref={scrollRef}
        aria-live="polite"
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-[18px] pb-4 [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-14px),transparent)]"
      >
        {messages.map(renderMessage)}
      </main>
      <Composer highlightCamera={suggestPhoto} />
    </>
  );
}

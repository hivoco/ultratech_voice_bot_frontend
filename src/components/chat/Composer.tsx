"use client";

import Image from "next/image";
import { memo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { LANG_LABEL } from "@/lib/types";
import { Icon } from "../ui/Icon";

// Start downloading a screen's code on intent (hover / focus / touch) so it opens instantly.
const warmVoice = () => {
  void import("../screens/VoiceScreen");
  void import("livekit-client");
};
const warmCamera = () => void import("../screens/CameraScreen");

export function Composer({ highlightCamera }: { highlightCamera?: boolean }) {
  const { state, step, submitText, startVoice, openCamera, clearPendingPhoto, sending, warmSession, endChat, restart, changeLanguage } =
    useApp();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { ended, profile } = state;
  const canSend = !ended && (text.trim().length > 0 || !!state.pendingPhoto) && !sending;
  const placeholder = ended ? "This conversation has ended" : step === "name" ? "Type your name…" : "Ask your question…";
  // Locked until a name is known, or after End chat.
  const locked = ended || step === "name";
  // Right after a PDF card (End chat, or a call ended with End chat) offer a fresh start.
  const offerNewChat = ended || state.messages.at(-1)?.kind === "summary";

  function send() {
    if (!canSend) return;
    submitText(text);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-4 shrink-0 pb-[max(20px,env(safe-area-inset-bottom))]">
      {offerNewChat ? (
        <div className="mb-3 flex justify-center">
          <ActionChip onClick={restart} icon={PLUS} label="Start a new chat" />
        </div>
      ) : (
        step === "done" && (
          <div className="mb-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Conversation actions">
            {profile.lang && profile.name && (
              <ActionChip
                onClick={changeLanguage}
                icon={GLOBE}
                label={LANG_LABEL[profile.lang]}
                ariaLabel={`Language: ${LANG_LABEL[profile.lang]}. Change language`}
              />
            )}
            <ActionChip
              onClick={startVoice}
              onIntent={warmVoice}
              icon={MIC}
              label="Talk by voice"
            />
            {/* Not mid-reply: the answer would land after the summary and need a second one. */}
            <ActionChip onClick={endChat} disabled={sending} icon={CROSS} label="End chat" danger />
          </div>
        )
      )}

      <AnimatePresence>
        {state.pendingPhoto && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-2"
          >
            <div className="relative size-14 overflow-hidden rounded-2xl border-2 border-brand">
              <Image src={state.pendingPhoto} alt="Photo to send" fill unoptimized className="object-cover" />
            </div>
            <p className="flex-1 text-[13px] text-white/75">Photo attached — add a note and send.</p>
            <button
              type="button"
              onClick={clearPendingPhoto}
              aria-label="Remove photo"
              className="grid size-9 place-items-center rounded-full bg-white/16"
            >
              <Icon src="/icons/x.svg" size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        className="glass relative flex h-[58px] items-center rounded-[29px] pr-1 pl-[9px] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-brand/60"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <button
          type="button"
          onClick={openCamera}
          onPointerEnter={warmCamera}
          onFocus={warmCamera}
          disabled={locked}
          aria-label="Send a photo"
          aria-describedby={step === "name" ? "composer-name-hint" : undefined}
          className="relative grid size-[38px] shrink-0 place-items-center rounded-full after:absolute after:-inset-1 after:content-[''] disabled:opacity-40"
        >
          {highlightCamera && (
            <motion.span
              className="absolute inset-[-2px]"
              animate={{ scale: [1, 1.08, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <Icon src="/icons/tap-hint.svg" size={42} />
            </motion.span>
          )}
          <Icon src="/icons/camera-composer.svg" size={24} className="relative" />
        </button>
        <label htmlFor="composer-input" className="sr-only">
          {placeholder}
        </label>
        {step === "name" && (
          <span id="composer-name-hint" className="sr-only">
            Enter your name first to send photos or talk by voice.
          </span>
        )}
        <input
          id="composer-input"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={warmSession}
          disabled={ended}
          placeholder={placeholder}
          autoComplete={step === "name" ? "given-name" : "off"}
          enterKeyHint="send"
          maxLength={500}
          className="mx-1.5 h-full min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/75 disabled:placeholder:text-white/55"
        />
        <AnimatePresence mode="wait" initial={false}>
          {canSend ? (
            <motion.button
              key="send"
              type="submit"
              aria-label="Send"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="grid size-12 shrink-0 place-items-center rounded-3xl bg-brand"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" stroke="#1C1A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              type="button"
              onClick={startVoice}
              onPointerEnter={warmVoice}
              onFocus={warmVoice}
              disabled={locked}
              aria-label="Ask by speaking"
              aria-describedby={step === "name" ? "composer-name-hint" : undefined}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: locked ? 0.5 : 1 }}  // motion's inline opacity would override disabled:opacity-*
              exit={{ scale: 0.6, opacity: 0 }}
              whileTap={{ scale: 0.92 }}
              className="grid size-12 shrink-0 place-items-center rounded-3xl bg-brand"
            >
              <Icon src="/icons/mic.svg" size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

const ActionChip = memo(function ActionChip({
  label,
  icon,
  onClick,
  onIntent,
  danger,
  disabled,
  ariaLabel,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  onIntent?: () => void;
  danger?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className={`flex h-9 disabled:opacity-50 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-[510] whitespace-nowrap transition-colors ${
        danger
          ? "border border-[#ff7a6b]/70 bg-[#ff5a4a]/14 text-[#ff8f80] hover:bg-[#ff5a4a]/22"
          : "bg-white/16 text-white hover:bg-white/24"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
});

function Glyph({ d }: { d: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Module constants so the memoized chips keep the same props between renders.
const PLUS = <Glyph d="M12 5v14M5 12h14" />;
const GLOBE = (
  <Glyph d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z" />
);
const MIC = <Glyph d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-6 9a6 6 0 0 0 12 0M12 18v3" />;
const CROSS = <Glyph d="M6 6l12 12M18 6 6 18" />;

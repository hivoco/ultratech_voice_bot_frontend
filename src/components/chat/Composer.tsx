"use client";

import Image from "next/image";
import { useRef, useState } from "react";
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
  const { state, step, submitText, startVoice, openCamera, clearPendingPhoto, sending, warmSession } = useApp();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const canSend = (text.trim().length > 0 || !!state.pendingPhoto) && !sending;
  const placeholder = step === "name" ? "Type your name…" : "Ask your question…";

  function send() {
    if (!canSend) return;
    submitText(text);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="mx-4 shrink-0 pb-[max(20px,env(safe-area-inset-bottom))]">
      {state.profile.lang && step === "done" && (
        <p className="mb-3 text-center text-[12px] text-white/70">
          Language: {LANG_LABEL[state.profile.lang]} · Same for typing and speaking
        </p>
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
          disabled={step === "name"}
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
          placeholder={placeholder}
          autoComplete={step === "name" ? "given-name" : "off"}
          enterKeyHint="send"
          maxLength={500}
          className="mx-1.5 h-full min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/75"
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
              disabled={step === "name"}
              aria-label="Ask by speaking"
              aria-describedby={step === "name" ? "composer-name-hint" : undefined}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              whileTap={{ scale: 0.92 }}
              className="grid size-12 shrink-0 place-items-center rounded-3xl bg-brand disabled:opacity-50"
            >
              <Icon src="/icons/mic.svg" size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

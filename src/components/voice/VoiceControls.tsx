"use client";

import { motion, useReducedMotion } from "motion/react";
import { Icon } from "../ui/Icon";

interface VoiceControlsProps {
  micEnabled: boolean;
  /** Overrides the mic button's accessible name when it does something else (e.g. retry). */
  micLabel?: string;
  onCamera: () => void;
  onMic: () => void;
  onClose: () => void;
}

/** Bottom row: Send photo · mic (80px, glowing) · End chat. */
export function VoiceControls({ micEnabled, micLabel, onCamera, onMic, onClose }: VoiceControlsProps) {
  const reduce = useReducedMotion();
  return (
    <div className="mx-auto grid w-full max-w-[393px] shrink-0 grid-cols-[1fr_auto_1fr] items-start px-[60px] pt-2 pb-[max(36px,env(safe-area-inset-bottom))] max-[300px]:px-3 short:pb-[max(24px,env(safe-area-inset-bottom))] tiny:pb-[max(16px,env(safe-area-inset-bottom))]">
      <RoundButton icon="/icons/camera.svg" label="Send photo" onClick={onCamera} className="justify-self-start" />
      <motion.button
        type="button"
        onClick={onMic}
        aria-label={micLabel ?? "Mute microphone"}
        aria-pressed={micLabel ? undefined : !micEnabled}
        whileTap={{ scale: 0.94 }}
        className={`relative grid size-20 place-items-center rounded-full max-[300px]:size-16 transition-[background-color,box-shadow] ${
          micEnabled ? "bg-brand shadow-[0_6px_24px_rgba(240,180,0,0.35)] hover:bg-brand-hover" : "card hover:bg-sand"
        }`}
      >
        {micEnabled && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand"
            animate={{ scale: [1, 1.18], opacity: [0.35, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <Icon src="/icons/mic.svg" size={24} className="relative" />
        {!micEnabled && <span aria-hidden className="absolute h-[2px] w-8 rotate-45 rounded bg-ink" />}
      </motion.button>
      <RoundButton icon="/icons/x.svg" label="End chat" onClick={onClose} className="justify-self-end" />
    </div>
  );
}

function RoundButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div className={`mt-3 flex w-14 flex-col items-center gap-2.5 max-[300px]:mt-2 max-[300px]:w-12 ${className}`}>
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        aria-label={label}
        className="card relative grid size-14 place-items-center rounded-full border-line-2 transition-colors hover:bg-sand max-[300px]:size-12"
      >
        <Icon src={icon} size={24} />
      </motion.button>
      <span aria-hidden className="text-[12px] whitespace-nowrap text-[#544e35]">
        {label}
      </span>
    </div>
  );
}

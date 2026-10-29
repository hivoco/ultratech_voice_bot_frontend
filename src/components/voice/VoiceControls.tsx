"use client";

import { motion } from "motion/react";
import { Icon } from "../ui/Icon";

interface VoiceControlsProps {
  micEnabled: boolean;
  onCamera: () => void;
  onMic: () => void;
  onClose: () => void;
}

/** Bottom row: Send photo · mic (80px, glowing) · End chat. */
export function VoiceControls({ micEnabled, onCamera, onMic, onClose }: VoiceControlsProps) {
  return (
    <div className="mx-auto grid w-full max-w-[393px] shrink-0 grid-cols-[1fr_auto_1fr] items-start px-[60px] pt-2 pb-[max(36px,env(safe-area-inset-bottom))]">
      <RoundButton icon="/icons/camera.svg" label="Send photo" onClick={onCamera} className="justify-self-start" />
      <motion.button
        type="button"
        onClick={onMic}
        aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
        aria-pressed={!micEnabled}
        whileTap={{ scale: 0.94 }}
        className={`relative grid size-20 place-items-center rounded-full transition-[background-color,box-shadow] ${
          micEnabled ? "bg-brand shadow-[0_0_15px_rgba(255,212,0,0.45)]" : "glass bg-white/10"
        }`}
      >
        {micEnabled && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand"
            animate={{ scale: [1, 1.18], opacity: [0.35, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <Icon src="/icons/mic.svg" size={24} className={`relative ${micEnabled ? "" : "invert"}`} />
        {!micEnabled && <span aria-hidden className="absolute h-[2px] w-8 rotate-45 rounded bg-white" />}
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
    <div className={`mt-3 flex w-14 flex-col items-center gap-2.5 ${className}`}>
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        aria-label={label}
        className="glass relative grid size-14 place-items-center rounded-full"
      >
        <Icon src={icon} size={24} />
      </motion.button>
      <span aria-hidden className="text-[12px] whitespace-nowrap text-white/75">
        {label}
      </span>
    </div>
  );
}

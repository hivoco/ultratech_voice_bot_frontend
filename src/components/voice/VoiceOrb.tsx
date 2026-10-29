"use client";

import Image from "next/image";
import { motion } from "motion/react";

export type OrbMode = "listening" | "thinking" | "speaking" | "muted";

// Bar heights from the Figma "wave" frame (76×50, 5px bars, 6px gap).
const BARS = [14, 30, 46, 26, 38, 18, 10];

interface VoiceOrbProps {
  mode: OrbMode;
  /** Animate the bars (someone is talking). */
  active?: boolean;
  onClick?: () => void;
  label: string;
}

/** The 220px glass orb with a glowing yellow core. Speaking mode shrinks it to 72% (158px). */
export function VoiceOrb({ mode, active, onClick, label }: VoiceOrbProps) {
  const scale = mode === "speaking" ? 0.72 : 1;

  // Interactive only while it can interrupt; otherwise a labelled status image.
  const Root = onClick ? motion.button : motion.div;
  return (
    <Root
      {...(onClick ? { type: "button" as const, onClick } : { role: "img" })}
      aria-label={label}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      whileTap={onClick ? { scale: scale * 0.96 } : undefined}
      className="relative size-[220px] shrink-0 rounded-full"
    >
      {mode === "thinking" ? (
        <motion.span
          className="absolute inset-0"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image src="/orb/orb-thinking.svg" alt="" width={220} height={220} unoptimized loading="eager" />
        </motion.span>
      ) : (
        <span className="glass absolute inset-0 rounded-full">
          {/* Core: 120px circle at (48,48) inside the border; the glow SVG bleeds 44px around it. */}
          <motion.span
            className="absolute top-[48px] left-[48px] size-[120px]"
            animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
          >
            {mode === "muted" ? (
              <Image src="/orb/core-muted.svg" alt="" width={120} height={120} unoptimized />
            ) : (
              <Image
                src="/orb/core-listening.svg"
                alt=""
                width={208}
                height={208}
                unoptimized
                loading="eager"
                className="absolute top-[-44px] left-[-44px] max-w-none"
              />
            )}
          </motion.span>
          <span
            className={`absolute top-[83px] left-[70px] flex h-[50px] w-[76px] items-center justify-center gap-1.5 ${
              mode === "muted" ? "opacity-35" : ""
            }`}
          >
            {BARS.map((h, i) => (
              <motion.span
                key={i}
                className="w-[5px] rounded-[3px] bg-ink/85"
                style={{ height: h }}
                animate={active ? { scaleY: [1, 0.35 + ((i * 37) % 60) / 100, 1.15, 1] } : { scaleY: 1 }}
                transition={
                  active
                    ? { duration: 0.9 + (i % 3) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 }
                    : { duration: 0.3 }
                }
              />
            ))}
          </span>
        </span>
      )}
    </Root>
  );
}

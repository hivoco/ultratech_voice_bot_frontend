"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

export type OrbMode = "listening" | "thinking" | "speaking" | "muted";

// Wave pill bars (v5 "Orb · Listening" / "Speaking"): yellow and ink bars, the middle one tallest.
const BARS = [10, 18, 12, 26, 14, 20, 10];
const BAR_COLOR = ["#f0b400", "#1c1a14", "#f0b400", "#1c1a14", "#f0b400", "#1c1a14", "#f0b400"];

interface VoiceOrbProps {
  mode: OrbMode;
  /** Animate the bars and rings (someone is talking). */
  active?: boolean;
  onClick?: () => void;
  label: string;
}

/**
 * v5 voice orb, drawn in a 220px box (the faint outer rings bleed past it): the engineer's photo on a
 * white disc, inside a yellow → orange ring, with a small white pill below showing the state —
 * wave bars (listening / speaking), three dots (thinking) or a red dot (couldn't hear / mic off).
 */
export function VoiceOrb({ mode, active, onClick, label }: VoiceOrbProps) {
  // Interactive only while it can interrupt; otherwise a labelled status image.
  const Root = onClick ? motion.button : motion.div;
  const live = mode === "listening" || mode === "speaking";
  // MotionConfig "user" only stops transforms; the decorative opacity loops stop here too.
  const reduce = useReducedMotion();
  const loop = !!active && !reduce;
  return (
    <Root
      {...(onClick ? { type: "button" as const, onClick } : { role: "img" })}
      aria-label={label}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      className="relative size-[220px] shrink-0 rounded-full"
    >
      {/* Faint outer rings (r 107 and 128), breathing while someone talks. */}
      {live &&
        [214, 256].map((d, i) => (
          <motion.span
            key={d}
            aria-hidden
            className="absolute top-1/2 left-1/2 rounded-full border border-brand/45"
            style={{ width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2 }}
            animate={loop ? { scale: [1, 1.04, 1], opacity: [0.9, 0.5, 0.9] } : { scale: 1, opacity: 0.7 }}
            transition={{ duration: 1.8, repeat: loop ? Infinity : 0, ease: "easeInOut", delay: i * 0.25 }}
          />
        ))}
      {/* Soft yellow glow behind the orb (v5 listening, speaking and thinking). */}
      {mode !== "muted" && (
        <span aria-hidden className="absolute inset-[-30px] rounded-full bg-[radial-gradient(closest-side,rgb(255_212_0/0.18),transparent)]" />
      )}

      {/* Main ring (r 88): gradient while live, a spinning arc while thinking, dashed when muted. */}
      {live && (
        <span aria-hidden className="absolute inset-[22px] rounded-full bg-[linear-gradient(160deg,#ffe36a_0%,#ffc21f_45%,#f39a12_100%)]" />
      )}
      {mode === "thinking" && (
        <>
          <span aria-hidden className="absolute inset-[22px] rounded-full bg-[#f1e4b4]" />
          <motion.span
            aria-hidden
            className="absolute inset-[22px] rounded-full bg-[conic-gradient(from_0deg,#f39a12,#ffd400_55%,transparent_56%)]"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}
      {mode === "muted" && (
        <span aria-hidden className="absolute inset-[22px] rounded-full border-2 border-dashed border-[#c9bc94]" />
      )}

      {/* Pale band (r 79) and white disc (r 72) holding the photo (r 66). */}
      {mode !== "muted" && <span aria-hidden className="absolute inset-[31px] rounded-full bg-[#fbefc4]" />}
      <span className="absolute inset-[38px] rounded-full bg-paper shadow-[0_4px_16px_rgb(140_110_20/0.15)]" />
      <span className={`absolute inset-[44px] overflow-hidden rounded-full bg-paper ${mode === "muted" ? "opacity-75" : ""}`}>
        <Image src="/images/engineer-avatar.png" alt="" width={132} height={132} loading="eager" className="size-full object-cover" />
      </span>

      {/* State pill, centred on the bottom of the photo. */}
      <span
        aria-hidden
        className={`absolute left-1/2 flex -translate-x-1/2 items-center justify-center gap-[3px] rounded-full bg-paper shadow-[0_4px_14px_rgb(140_110_20/0.18)] ${
          mode === "speaking" ? "top-[172px] h-[48px] w-[80px]" : "top-[176px] h-[36px] px-3"
        }`}
      >
        {live &&
          BARS.map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full"
              style={{ height: mode === "speaking" ? h * 1.35 : h, background: BAR_COLOR[i] }}
              animate={active ? { scaleY: [1, 0.4 + ((i * 37) % 60) / 100, 1.15, 1] } : { scaleY: 0.6 }}
              transition={
                active ? { duration: 0.9 + (i % 3) * 0.15, repeat: Infinity, ease: "easeInOut", delay: i * 0.07 } : { duration: 0.3 }
              }
            />
          ))}
        {mode === "thinking" &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="mx-[1px] size-[7px] rounded-full bg-ink"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        {mode === "muted" && (
          <>
            <span className="mr-1 size-[7px] rounded-full bg-[#e5483a]" />
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="size-[4px] rounded-full bg-[#c9c3b4]" />
            ))}
          </>
        )}
      </span>
    </Root>
  );
}

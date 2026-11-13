"use client";

import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { Chip } from "../ui/Chip";

/**
 * Language / stage chips with life: they pop in one after another, and while the expert is waiting
 * for a pick (`waiting`), a small wave runs across them every few seconds so the next step is
 * obvious. Reduced motion: no pop-in delay, no wave.
 */
export function OptionChips<T extends string>({
  label,
  options,
  labelOf,
  langOf,
  selected,
  disabled,
  waiting,
  onPick,
}: {
  label: string;
  options: readonly T[];
  labelOf: (o: T) => string;
  langOf?: (o: T) => string | undefined;
  selected?: string;
  disabled: boolean;
  waiting: boolean;
  onPick: (o: T) => void;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    void controls.start((i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 26, delay: 0.05 + i * 0.07 },
    }));
  }, [controls, reduce]);

  useEffect(() => {
    if (!waiting || reduce) return;
    // First nudge after a short pause, then every 5 s until something is picked.
    const wave = () =>
      void controls.start((i: number) => ({
        y: [0, -4, 0],
        transition: { duration: 0.42, ease: "easeOut", delay: i * 0.08 },
      }));
    const first = window.setTimeout(wave, 2500);
    const every = window.setInterval(wave, 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [waiting, reduce, controls]);

  return (
    <div className="flex w-full flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((opt, i) => (
        <motion.div key={opt} custom={i} initial={{ opacity: 0, scale: 0.85, y: 6 }} animate={controls} whileTap={disabled ? undefined : { scale: 0.92 }}>
          <Chip label={labelOf(opt)} lang={langOf?.(opt)} selected={selected === opt} disabled={disabled} onClick={() => onPick(opt)} />
        </motion.div>
      ))}
    </div>
  );
}

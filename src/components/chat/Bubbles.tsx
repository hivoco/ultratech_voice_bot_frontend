"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { plainText, textLang } from "@/lib/id";
import { Icon } from "../ui/Icon";
import { SummaryButton } from "./SummaryButton";

const enter = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 380, damping: 32 },
} as const;

export function EngineerBubble({
  lead,
  prompt,
  text,
  voiceMeta,
  streaming,
  animateIn = true,
  children,
}: {
  lead?: string;
  prompt?: string;
  text?: string;
  voiceMeta?: string;
  streaming?: boolean;
  /** false for the server-rendered greeting so it paints immediately (LCP). */
  animateIn?: boolean;
  children?: ReactNode;
}) {
  const transcript = text !== undefined;
  return (
    <motion.div
      {...enter}
      initial={animateIn ? enter.initial : false}
      lang={textLang(lead, prompt, text)}
      className={`card relative flex w-[340px] max-w-[94%] flex-col items-start rounded-[22px] rounded-bl-[6px] px-4 ${
        transcript ? "gap-2 pt-3 pb-[14px]" : "gap-2.5 pt-[14px] pb-4"
      }`}
    >
      {voiceMeta && (
        <p className="flex w-full items-center gap-1.5 text-[12px] font-[510] text-muted">
          <Icon src="/icons/voice-wave.svg" size={14} />
          {voiceMeta}
        </p>
      )}
      {lead && <p className="text-[15px] leading-[21px] text-ink-soft">{lead}</p>}
      {prompt && <p className="text-[15px] leading-[19px] font-[590] text-ink">{prompt}</p>}
      {transcript &&
        (streaming && !text ? (
          <TypingDots />
        ) : (
          <p className="text-[15px] leading-[22px] break-words whitespace-pre-line text-ink-soft">
            {plainText(text)}
            {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand align-[-2px]" />}
          </p>
        ))}
      {children}
    </motion.div>
  );
}

function TypingDots() {
  return (
    <span className="flex h-[22px] items-center gap-1.5" role="status">
      <span className="sr-only">The engineer is typing…</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          aria-hidden
          key={i}
          className="size-2 rounded-full bg-ink/45"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export function UserBubble({ text, photo, photoLabel }: { text: string; photo?: string; photoLabel?: string }) {
  return (
    <motion.div {...enter} lang={textLang(text)} className="flex w-full justify-end">
      {photo ? (
        <div className="flex w-[260px] max-w-[85%] flex-col gap-2.5 rounded-[22px] rounded-br-[6px] bg-brand px-1.5 pt-1.5 pb-3">
          <div className="relative h-[118px] w-full overflow-hidden rounded-2xl bg-viewfinder">
            <Image src={photo} alt="Photo you shared" fill unoptimized className="object-cover" />
            {photoLabel && (
              <span className="absolute bottom-[11px] left-2.5 rounded-full bg-black/55 px-2 py-1 text-[11px] font-[510] text-white">
                {photoLabel}
              </span>
            )}
          </div>
          <p className="px-1.5 text-[16px] leading-[22px] font-[510] break-words text-ink">{text}</p>
        </div>
      ) : (
        <p className="max-w-[min(292px,85%)] rounded-[22px] rounded-br-[6px] bg-brand px-4 py-3 text-[16px] leading-[22px] font-[510] break-words text-ink">
          {text}
        </p>
      )}
    </motion.div>
  );
}

export function DurationChip({ text }: { text: string }) {
  return (
    <motion.div {...enter} className="flex w-full justify-center">
      <p className="flex items-center gap-1.5 rounded-full border border-line-2 bg-paper px-3 py-1.5 text-[12px] font-[510] text-[#3e3c37] tabular-nums">
        <Icon src="/icons/mic-small.svg" size={13} />
        {text}
      </p>
    </motion.div>
  );
}

/** "Baat Ghar Ki" video recommendation sent by the worker on the "video" data topic. */
export function VideoCard({ url, title }: { url: string; title: string }) {
  return (
    <motion.a
      {...enter}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="card relative flex w-[340px] max-w-[94%] items-center gap-3 rounded-[22px] rounded-bl-[6px] p-3 transition-transform active:scale-[0.98]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path d="M8 5.5v13l10.5-6.5z" fill="#1c1a14" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-[510] text-muted">Baat Ghar Ki · Video</span>
        <span className="line-clamp-2 text-[15px] leading-[20px] font-[590] text-ink">
          {title || "Watch the related video"}
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </span>
    </motion.a>
  );
}

export function ExpertCard({ name, role, callSlot, phone }: { name: string; role: string; callSlot?: string; phone?: string }) {
  return (
    <motion.div {...enter} className="card relative flex w-full flex-col gap-3 rounded-3xl p-4">
      <div className="flex w-full items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[22px] bg-brand">
          <Icon src="/icons/hat.svg" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] leading-[19px] font-[590] break-words text-ink">{name}</p>
          {role && (
            <p className="mt-0.5 truncate text-[12px] text-muted" title={role}>
              {role}
            </p>
          )}
        </div>
        <Icon src="/icons/shield.svg" size={22} />
      </div>
      {callSlot && (
        <p className="flex w-full items-center gap-2 rounded-xl bg-sand px-3 py-2.5 text-[13px] font-[510] text-ink">
          <Icon src="/icons/phone-slot.svg" size={16} />
          {callSlot}
        </p>
      )}
      <div className="flex w-full gap-2">
        {/* No booking endpoint yet (docs/05-expert-and-video-cards.md) — visible per Figma, not actionable. */}
        <button
          type="button"
          aria-disabled
          title="Site-visit booking is coming soon"
          className="flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-[14px] bg-brand p-3 text-[14px] font-[590] text-ink"
        >
          <Icon src="/icons/calendar.svg" size={16} />
          Book a site visit
          <span className="sr-only"> (coming soon)</span>
        </button>
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label={`Call ${name}`}
            className="grid place-items-center rounded-[14px] border border-line-2 bg-paper px-3.5 py-3 transition-colors hover:bg-sand"
          >
            <Icon src="/icons/phone.svg" size={16} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

/** Card holding the PDF summary button, shown when a chat or call ends. Covers the first `turns` turns. */
export function SummaryCard({ turns }: { turns: number }) {
  return (
    <motion.div {...enter} className="card relative w-full rounded-3xl p-3">
      <SummaryButton turns={turns} />
    </motion.div>
  );
}

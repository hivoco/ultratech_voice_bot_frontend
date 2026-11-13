"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { playSfx } from "@/lib/sfx";
import { plainText, textLang } from "@/lib/id";
import { Icon } from "../ui/Icon";
import { whatsappLink } from "@/lib/contact";
import type { ExpertContact } from "@/lib/types";
import { SummaryButton } from "./SummaryButton";

const enter = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 380, damping: 32 },
} as const;

/** Messages that already played their typing intro (module scope: survives screen switches). */
const typedOnce = new Set<string>();

export function EngineerBubble({
  lead,
  prompt,
  text,
  voiceMeta,
  streaming,
  animateIn = true,
  typeFirst = 0,
  typeKey,
  waiting = false,
  children,
}: {
  lead?: string;
  prompt?: string;
  text?: string;
  voiceMeta?: string;
  streaming?: boolean;
  /** false for the server-rendered greeting so it paints immediately (LCP). */
  animateIn?: boolean;
  /** Show typing dots for this many ms before the message (scripted onboarding lines). */
  typeFirst?: number;
  /** Message id: a message types only the first time it appears (not again when the chat screen remounts). */
  typeKey?: string;
  /** Waiting for the user to pick an option: a soft brand-yellow glow pulses around the bubble. */
  waiting?: boolean;
  children?: ReactNode;
}) {
  const transcript = text !== undefined;
  const [revealed, setRevealed] = useState(typeFirst <= 0 || (!!typeKey && typedOnce.has(typeKey)));
  useEffect(() => {
    if (revealed) return;
    const t = window.setTimeout(() => {
      if (typeKey) typedOnce.add(typeKey);
      setRevealed(true);
      playSfx("receive");
    }, typeFirst);
    return () => window.clearTimeout(t);
  }, [revealed, typeFirst, typeKey]);
  // An AI answer landing (typing dots → text) gets the same pop.
  const wasStreaming = useRef(streaming);
  useEffect(() => {
    if (wasStreaming.current && !streaming && text) playSfx("receive");
    wasStreaming.current = streaming;
  }, [streaming, text]);

  if (!revealed) {
    return (
      <motion.div {...enter} className="card relative flex w-fit flex-col items-start rounded-[22px] rounded-bl-[6px] px-4 py-3">
        <TypingDots />
      </motion.div>
    );
  }
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
      {waiting && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-brand"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.75, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        />
      )}
    </motion.div>
  );
}

/**
 * Suggested follow-ups inside the engineer bubble (built in store.tsx `buildSuggestions`). Tapping
 * one sends its `send` text as the user's next message. Only the newest answer's list is tappable;
 * its first button is highlighted (brand yellow). Older lists stay as plain, read-only history.
 */
export function Suggestions({
  title,
  items,
  active,
  onPick,
}: {
  title: string;
  items: { label: string; send: string }[];
  active: boolean;
  onPick?: (text: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2 pt-0.5" role="group" aria-label={title} lang={textLang(title, ...items.map((k) => k.label))}>
      <p className="text-[14px] leading-[18px] font-[590] text-muted">{title}</p>
      {items.map((k, i) => {
        const first = active && i === 0;
        return (
          <button
            key={i}
            type="button"
            disabled={!active}
            onClick={() => onPick?.(k.send)}
            className={`flex w-full items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition-[background-color,transform] enabled:active:scale-[0.98] disabled:cursor-default ${
              first ? "border-brand bg-[#fdf7d8] text-[#c9a100] enabled:hover:bg-tip" : "border-line-2 bg-paper text-ink enabled:hover:bg-sand"
            }`}
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="shrink-0">
              <path d="M12 3.5c-4.97 0-9 3.58-9 8 0 1.7.6 3.28 1.62 4.58L3.5 20.5l4.7-1.3c1.14.5 2.45.8 3.8.8 4.97 0 9-3.58 9-8s-4.03-8.5-9-8.5Z" />
            </svg>
            <span className="min-w-0 flex-1 text-[15px] leading-[19px] font-[590] [overflow-wrap:anywhere] text-ink">{k.label}</span>
            {active && (
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
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
        <p className="max-w-[min(292px,85%)] rounded-[22px] rounded-br-[6px] bg-brand px-4 py-3 text-[16px] leading-[22px] font-[510] break-words whitespace-pre-line text-ink">
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

/**
 * Site-engineer hand-off card. Buttons appear only for the channels the backend actually sent
 * (booking link, phone, WhatsApp, email — src/lib/contact.ts validates them). With none, the card
 * shows just the "what to do now" note: no dead buttons.
 */
export function ExpertCard({ name, role, note, callSlot, phone, whatsapp, email, bookingUrl }: ExpertContact) {
  const secondary = "flex items-center justify-center gap-1.5 rounded-[14px] border border-line-2 bg-paper px-3.5 py-3 text-[14px] font-[590] text-ink transition-colors hover:bg-sand";
  return (
    <motion.div {...enter} lang={textLang(name, note)} className="card relative flex w-full flex-col gap-3 rounded-3xl p-4">
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
      {note && <p className="w-full text-[14px] leading-[20px] [overflow-wrap:anywhere] text-ink-soft">{note}</p>}
      {callSlot && (
        <p className="flex w-full items-center gap-2 rounded-xl bg-sand px-3 py-2.5 text-[13px] font-[510] text-ink">
          <Icon src="/icons/phone-slot.svg" size={16} />
          {callSlot}
        </p>
      )}
      {(bookingUrl || phone || whatsapp || email) && (
        <div className="flex w-full flex-wrap gap-2">
          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 basis-full items-center justify-center gap-1.5 rounded-[14px] bg-brand p-3 text-[14px] font-[590] text-ink transition-colors hover:bg-brand-hover"
            >
              <Icon src="/icons/calendar.svg" size={16} />
              Book a site visit
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/[ -]/g, "")}`} className={`${secondary} flex-1`}>
              <Icon src="/icons/phone.svg" size={16} />
              Call
            </a>
          )}
          {whatsapp && (
            <a href={whatsappLink(whatsapp)} target="_blank" rel="noopener noreferrer" className={`${secondary} flex-1`}>
              WhatsApp
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className={`${secondary} flex-1`}>
              Email
            </a>
          )}
        </div>
      )}
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

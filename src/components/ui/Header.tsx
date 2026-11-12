"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { Icon } from "./Icon";

/** Enlarges a small icon button's hit area to 44px without changing how it looks. */
const HIT_AREA = "relative after:absolute after:-inset-1 after:content-['']";

interface HeaderProps {
  onBack: () => void;
  backLabel: string;
  /** Right-hand slot: <KeyboardButton/> on voice screens, <HeaderMenu/> on chat screens. */
  trailing?: ReactNode;
}

export function Header({ onBack, backLabel, trailing }: HeaderProps) {
  const { online, voice } = useApp();

  const status =
    voice.status === "connecting"
      ? "Connecting…"
      : online === false
        ? "Offline"
        : online === undefined
          ? "AI assistant"
          : "AI assistant · Online";

  return (
    <header className="relative z-20 mx-4 mt-[max(12px,env(safe-area-inset-top))] shrink-0">
      <div className="card relative flex h-[68px] items-center rounded-[34px] pr-[14px] pl-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-m-2 grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-sand"
        >
          <Icon src="/icons/back.svg" size={24} />
        </button>
        <div className="ml-1 size-[44px] shrink-0 max-[300px]:hidden">
          <Image src="/images/engineer-avatar.png" alt="" width={44} height={44} loading="eager" />
        </div>
        <div className="ml-[10px] min-w-0 flex-1">
          <p translate="no" className="truncate text-[17px] leading-[20px] font-[590] text-ink max-[359px]:text-[15px]">UltraTech Engineer</p>
          <p className="mt-[3px] flex items-center gap-[6px] text-[13px] leading-[16px] text-ink-2" role="status">
            {online === false ? (
              <span className="size-[7px] rounded-full bg-muted/50" aria-hidden />
            ) : (
              <Icon src="/icons/online-dot.svg" size={7} className={online ? "" : "opacity-50"} />
            )}
            <span className="truncate">{status}</span>
          </p>
        </div>
        {trailing}
      </div>
    </header>
  );
}

export function KeyboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Type instead"
      className={`grid size-9 shrink-0 place-items-center rounded-full border border-line-2 bg-paper transition-colors hover:bg-sand ${HIT_AREA}`}
    >
      <Icon src="/icons/keyboard.svg" size={20} />
    </button>
  );
}

export interface MenuItem {
  label: string;
  run: () => void;
}

/** "More" (⋯) button with a small keyboard-accessible menu. */
export function HeaderMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }, [open]);

  // Close on any tap / click outside the menu and its button (a document listener, not a
  // full-screen backdrop div, which a transformed or filtered header would clip to its own box).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`grid size-9 shrink-0 place-items-center rounded-full border border-line-2 bg-paper transition-colors hover:bg-sand ${HIT_AREA}`}
      >
        <Icon src="/icons/more.svg" size={22} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            role="menu"
            aria-label="More options"
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            // Solid, not card: a backdrop blur nested inside the card header doesn't blur the chat behind it.
            className="absolute top-[76px] right-0 z-20 w-[220px] origin-top-right overflow-hidden rounded-[20px] border border-line bg-paper p-1.5 shadow-[0_12px_32px_rgb(90_70_10/0.18)]"
          >
            {items.map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.run();
                  }}
                  className="relative w-full rounded-[14px] px-3.5 py-2.5 text-left text-[15px] font-[510] text-ink transition-colors hover:bg-sand focus-visible:bg-sand"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}

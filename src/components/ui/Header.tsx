"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useApp } from "@/lib/store";
import { Icon } from "./Icon";

interface HeaderProps {
  onBack: () => void;
  backLabel: string;
  /** "keyboard" on the voice screens (switch to typing), "more" on chat screens (menu). */
  action: "keyboard" | "more";
  onKeyboard?: () => void;
}

export function Header({ onBack, backLabel, action, onKeyboard }: HeaderProps) {
  const { online, voice, changeLanguage, endConversation, startVoice, state } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <div className="glass relative flex h-[68px] items-center rounded-[34px] pr-[14px] pl-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-m-2 grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
        >
          <Icon src="/icons/back.svg" size={24} />
        </button>
        <div className="ml-1.5 size-[44px] shrink-0 overflow-hidden rounded-[12px] shadow-[0_2px_9px_rgba(0,0,0,0.45),0_4px_10px_rgba(0,0,0,0.25)]">
          <Image src="/images/ultratech-logo.png" alt="UltraTech" width={44} height={44} priority />
        </div>
        <div className="ml-[10px] min-w-0 flex-1">
          <h1 className="truncate text-[17px] leading-[20px] font-[590] text-white">UltraTech Engineer</h1>
          <p className="mt-[3px] flex items-center gap-[6px] text-[13px] leading-[16px] text-white/82">
            {online === false ? (
              <span className="size-[7px] rounded-full bg-white/40" aria-hidden />
            ) : (
              <Icon src="/icons/online-dot.svg" size={7} className={online ? "" : "opacity-50"} />
            )}
            <span className="truncate">{status}</span>
          </p>
        </div>
        {action === "keyboard" ? (
          <button
            type="button"
            onClick={onKeyboard}
            aria-label="Type instead"
            className="grid size-9 shrink-0 place-items-center rounded-[18px] bg-white/20 transition-colors hover:bg-white/30"
          >
            <Icon src="/icons/keyboard.svg" size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="grid size-9 shrink-0 place-items-center rounded-[18px] bg-white/20 transition-colors hover:bg-white/30"
          >
            <Icon src="/icons/more.svg" size={22} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <motion.ul
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="glass absolute top-[76px] right-0 z-20 w-[220px] origin-top-right overflow-hidden rounded-[20px] bg-[#2a2218]/80 p-1.5"
            >
              {[
                state.profile.lang && { label: "Change language", run: changeLanguage },
                { label: "Talk by voice", run: startVoice },
                { label: "End conversation", run: endConversation },
              ]
                .filter((i): i is { label: string; run: () => void } => !!i)
                .map((item) => (
                  <li key={item.label} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        item.run();
                      }}
                      className="relative w-full rounded-[14px] px-3.5 py-2.5 text-left text-[15px] font-[510] text-white transition-colors hover:bg-white/10"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

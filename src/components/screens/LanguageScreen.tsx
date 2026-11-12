"use client";

import Image from "next/image";
import { useApp } from "@/lib/store";
import { LANG_LABEL, type LangChoice } from "@/lib/types";
import { Icon } from "../ui/Icon";

const LANGS: LangChoice[] = ["en", "hi", "hinglish"];

/**
 * First screen on every page load, for new and returning users alike. It is the page's LCP element,
 * so it is server-rendered with no entrance animation (see docs/lighthouse.md).
 */
export function LanguageScreen() {
  const { state, pickLanguage } = useApp();

  return (
    <main className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="my-auto flex w-full flex-col items-center">
        <div className="size-24 drop-shadow-[0_6px_16px_rgb(140_110_20/0.2)]">
          <Image src="/images/engineer-avatar.png" alt="UltraTech Engineer" width={96} height={96} loading="eager" />
        </div>

        <h1 className="mt-6 text-center text-balance text-[24px] leading-[30px] font-[590] text-ink">
          Choose your language
          <span lang="hi" className="mt-1 block text-[17px] leading-[24px] font-[510] text-ink-2">
            अपनी भाषा चुनें
          </span>
        </h1>

        {/* Disabled until hydrated: a tap must not race the saved profile being loaded. */}
        <div role="group" aria-label="Language" className="mt-8 flex w-full flex-col gap-3">
          {LANGS.map((lang) => {
            const lastUsed = state.profile.lang === lang;
            return (
              <button
                key={lang}
                type="button"
                lang={lang === "hi" ? "hi" : undefined}
                disabled={!state.hydrated}
                onClick={() => pickLanguage(lang)}
                className={`flex h-14 w-full items-center justify-center gap-2 rounded-[28px] text-[17px] transition-[background-color,transform] active:scale-[0.98] disabled:active:scale-100 ${
                  lastUsed ? "border border-brand bg-brand font-[590] text-ink" : "border border-line-2 bg-paper font-[510] text-ink enabled:hover:bg-sand"
                }`}
              >
                {lastUsed && <Icon src="/icons/check.svg" size={18} />}
                {LANG_LABEL[lang]}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

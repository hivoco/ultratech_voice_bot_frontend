"use client";

import Image from "next/image";
import { useEffect } from "react";

/**
 * Fallback if anything in the app throws while rendering, so a bug never leaves a blank page.
 * `retry` re-renders the page (a fresh chat); "Reload" is the stronger fallback.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[ultratech] app error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[430px] flex-col items-center justify-center gap-5 bg-page px-6 text-center">
      <Image src="/images/engineer-avatar.png" alt="" width={88} height={88} />
      <div>
        <h1 className="text-balance text-[24px] leading-[30px] font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 text-pretty text-[15px] leading-[22px] text-ink-2">
          The chat hit a problem and couldn&apos;t continue. Try again; if it keeps happening, reload the page.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-5 py-2.5 text-[15px] font-[590] text-ink transition-colors hover:bg-brand-hover"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-line-2 bg-paper px-5 py-2.5 text-[15px] font-[590] text-ink transition-colors hover:bg-sand"
        >
          Reload page
        </button>
      </div>
    </main>
  );
}

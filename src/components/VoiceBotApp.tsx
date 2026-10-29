"use client";

import { Activity, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "@/lib/store";
import { ChatScreen } from "./screens/ChatScreen";

// The first paint is always the chat screen; the rest load on demand.
const VoiceScreen = dynamic(() => import("./screens/VoiceScreen").then((m) => m.VoiceScreen));
const CameraScreen = dynamic(() => import("./screens/CameraScreen").then((m) => m.CameraScreen));
const WrapUpScreen = dynamic(() => import("./screens/WrapUpScreen").then((m) => m.WrapUpScreen));

export function VoiceBotApp() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <Shell />
        </AppProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

/** Move focus into a screen when it appears, so keyboard/screen-reader users aren't left on <body>. */
const focusScreen = (el: HTMLElement | null) => el?.focus({ preventScroll: true });

function Shell() {
  const { state } = useApp();
  const screen = state.screen;
  const chatRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (screen === "chat") focusScreen(chatRef.current);
  }, [screen]);

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-surface sm:my-0 sm:shadow-[0_0_80px_rgba(0,0,0,0.6)]">
      {/* "legibility" gradient from the Figma frames */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,15,8,0.1),rgba(20,15,8,0.35)_55%,rgba(15,10,5,0.62))]"
      />

      {/* Chat stays mounted while other screens are open: draft text, scroll and bubbles survive. */}
      <Activity mode={screen === "chat" ? "visible" : "hidden"}>
        <div ref={chatRef} tabIndex={-1} className="relative flex min-h-0 flex-1 flex-col focus:outline-none">
          <ChatScreen />
        </div>
      </Activity>

      <AnimatePresence mode="wait" initial={false}>
        {screen !== "chat" && (
          <motion.div
            key={screen}
            ref={focusScreen}
            tabIndex={-1}
            className="relative flex min-h-0 flex-1 flex-col focus:outline-none"
            initial={{ opacity: 0, y: screen === "camera" ? 24 : 0, scale: screen === "camera" ? 1 : 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {screen === "voice" && <VoiceScreen />}
            {screen === "camera" && <CameraScreen />}
            {screen === "wrapup" && <WrapUpScreen />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

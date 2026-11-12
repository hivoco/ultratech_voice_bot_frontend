"use client";

import { Activity, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import { AppProvider, useApp } from "@/lib/store";
import { ChatScreen } from "./screens/ChatScreen";
// v5 asks for the language inside the chat; the old full-screen picker is kept but not shown.
// import { LanguageScreen } from "./screens/LanguageScreen";

// The first paint is always the chat; the rest load on demand.
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
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-page sm:my-0 sm:shadow-[0_0_80px_rgb(120_95_20/0.25)]">

      {/* Old language screen (pre-v5), kept for reference. Not in AnimatePresence below: it would
          overlap the chat while animating out.
      {screen === "language" && <LanguageScreen />} */}

      {/* Chat stays mounted while other screens are open: draft text, scroll and bubbles survive. */}
      <Activity mode={screen === "chat" ? "visible" : "hidden"}>
        <div ref={chatRef} tabIndex={-1} className="relative flex min-h-0 flex-1 flex-col focus:outline-none">
          <ChatScreen />
        </div>
      </Activity>

      <AnimatePresence mode="wait" initial={false}>
        {screen !== "chat" && screen !== "language" && (
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

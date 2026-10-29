"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AppProvider, useApp } from "@/lib/store";
import dynamic from "next/dynamic";
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

function Shell() {
  const { state } = useApp();
  const screen = state.screen;

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-surface sm:my-0 sm:shadow-[0_0_80px_rgba(0,0,0,0.6)]">
      {/* "legibility" gradient from the Figma frames */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,15,8,0.1),rgba(20,15,8,0.35)_55%,rgba(15,10,5,0.62))]"
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screen}
          className="relative flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, y: screen === "camera" ? 24 : 0, scale: screen === "camera" ? 1 : 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {screen === "chat" && <ChatScreen />}
          {screen === "voice" && <VoiceScreen />}
          {screen === "camera" && <CameraScreen />}
          {screen === "wrapup" && <WrapUpScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

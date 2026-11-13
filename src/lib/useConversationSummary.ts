"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSummary } from "./api";
import { useApp } from "./store";
import { buildTranscript } from "./transcript";
import { backendLang } from "./types";

/**
 * Summary + PDF for the current conversation, shared by the in-chat PDF card and the wrap-up
 * screen. `upTo` limits it to the first N turns (a card covers the chat as it was when it
 * appeared). Keyed by conversation and turn count: one paid Sarvam summary per state of the
 * conversation, reused wherever the button shows.
 */
export function useConversationSummary(upTo?: number) {
  const { state } = useApp();
  const { messages, conversationId, profile } = state;
  const transcript = useMemo(() => {
    const all = buildTranscript(messages);
    return upTo === undefined ? all : all.slice(0, upTo);
  }, [messages, upTo]);
  const lang = backendLang(profile.lang);

  const query = useQuery({
    queryKey: ["summary", conversationId, transcript.length],
    queryFn: () => fetchSummary(conversationId, lang, transcript, profile.lang),
    enabled: transcript.length > 0 && !!conversationId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const download = () => {
    const data = query.data;
    if (!data) return;
    if (data.pdf_url) window.open(data.pdf_url, "_blank", "noopener");
    // The print page is only needed on click: keep it out of the first bundle.
    else void import("./summaryPdf").then((m) => m.printSummary(data, transcript));
  };

  return { query, download };
}

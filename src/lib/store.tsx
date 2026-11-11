"use client";

import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createSession, fetchHealth, streamTurn } from "./api";
import { clock, longDuration, uid } from "./id";
import { backendLang, LANG_LABEL, type ChatMessage, type LangChoice, type Profile, type Screen, type Stage } from "./types";
import { turnText, useVoiceCall, type CallSummary, type VoiceCall } from "./useVoiceCall";
import { buildTranscript } from "./transcript";

const PROFILE_KEY = "ultratech.profile.v1";

export const GREETING_ID = "greeting";

/** Language isn't a step: LanguageScreen asks for it before the chat opens, on every page load. */
type OnboardingStep = "name" | "stage" | "done";

interface State {
  hydrated: boolean;
  screen: Screen;
  /** Screen to return to when the camera closes. */
  cameraReturn: Screen;
  profile: Profile;
  messages: ChatMessage[];
  /** Photo captured from the chat composer, waiting to be sent with the next message. */
  pendingPhoto: string | null;
  /** Id for this conversation (new on every restart); keys its summary / PDF on the backend. */
  conversationId: string;
  /** Time of the first question, for the "Conversation ended · 2 min 40 sec" chip. */
  startedAt: number | null;
  /** Text chat ended with End chat: composer locked until Start a new chat. */
  ended: boolean;
}

type Action =
  | { type: "hydrate"; profile: Profile }
  | { type: "screen"; screen: Screen }
  | { type: "openCamera" }
  | { type: "closeCamera" }
  | { type: "profile"; patch: Partial<Profile> }
  | { type: "push"; messages: ChatMessage[] }
  | { type: "patch"; id: string; patch: Partial<ChatMessage> }
  | { type: "pendingPhoto"; photo: string | null }
  /** A call finished: add its transcript, plus the PDF card when the call was ended with End chat. */
  | { type: "callEnded"; messages: ChatMessage[]; summary: boolean; at: number }
  | { type: "endChat"; at: number }
  | { type: "reset" };

function stepOf(p: Profile): OnboardingStep {
  if (!p.name) return "name";
  if (!p.stage) return "stage";
  return "done";
}

function openingMessages(p: Profile): ChatMessage[] {
  if (stepOf(p) === "done") {
    return [
      {
        id: uid(),
        kind: "engineer",
        lead: `Welcome back, ${p.name}! I'm with you at the ${p.stage} stage.`,
        prompt: "Which question about your home is on your mind today?",
      },
    ];
  }
  const greeting: ChatMessage = {
    // Stable id: part of the initial state, so server and client agree on it.
    id: GREETING_ID,
    kind: "engineer",
    lead: "Hi! I'm the UltraTech Engineer — with you at every step of building your home.",
    prompt: "What's your name?",
  };
  if (!p.name) return [greeting];
  // Name known but onboarding unfinished: resume at the stage question.
  return [greeting, { id: uid(), kind: "user", text: p.name }, stageQuestion(p.name)];
}

const stageQuestion = (name: string, lead?: string): ChatMessage => ({
  id: uid(),
  kind: "engineer",
  lead,
  prompt: `Welcome, ${name}! Which stage is your home at right now?`,
  options: "stage",
});

const langQuestion = (): ChatMessage => ({
  id: uid(),
  kind: "engineer",
  prompt: "Which language would you like to talk in?",
  options: "lang",
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        hydrated: true,
        profile: action.profile,
        messages: openingMessages(action.profile),
        conversationId: newConversationId(),
      };
    case "screen":
      return { ...state, screen: action.screen };
    case "openCamera":
      return { ...state, screen: "camera", cameraReturn: state.screen === "camera" ? state.cameraReturn : state.screen };
    case "closeCamera":
      return { ...state, screen: state.cameraReturn };
    case "profile":
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case "push":
      return {
        ...state,
        startedAt: state.startedAt ?? (action.messages.some((m) => m.kind === "user") ? Date.now() : null),
        messages: [...state.messages, ...action.messages],
      };
    case "callEnded": {
      const messages = [...state.messages, ...action.messages];
      const turns = buildTranscript(messages).length;
      if (action.summary && turns > 0) messages.push({ id: uid(), kind: "summary", turns });
      return { ...state, startedAt: state.startedAt ?? (action.messages.length ? action.at : null), messages };
    }
    case "endChat": {
      if (state.ended) return state;
      const turns = buildTranscript(state.messages).length;
      const hasTurns = turns > 0;
      const duration = state.startedAt ? ` · ${longDuration((action.at - state.startedAt) / 1000)}` : "";
      const closing: ChatMessage[] = [
        { id: uid(), kind: "divider", text: `Conversation ended${duration}` },
        {
          id: uid(),
          kind: "engineer",
          lead: hasTurns
            ? "Thanks for chatting! Your conversation summary is ready — questions, answers and key points in one PDF."
            : "Thanks for chatting! Start a new chat whenever you have a question about your home.",
        },
        ...(hasTurns ? [{ id: uid(), kind: "summary", turns } as const] : []),
      ];
      return { ...state, ended: true, pendingPhoto: null, messages: [...state.messages, ...closing] };
    }
    case "patch":
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id ? ({ ...m, ...action.patch } as ChatMessage) : m)),
      };
    case "pendingPhoto":
      return { ...state, pendingPhoto: action.photo };
    case "reset":
      return {
        ...state,
        screen: "chat",
        pendingPhoto: null,
        messages: openingMessages(state.profile),
        conversationId: newConversationId(),
        startedAt: null,
        ended: false,
      };
  }
}

/** Turn a finished call's timeline into chat transcript messages. */
function summaryToMessages({ timeline, durationSec }: CallSummary): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const item of timeline) {
    if (item.type === "turn") {
      const { final, interim } = turnText(item);
      const text = [final, interim].filter(Boolean).join(" ");
      if (!text) continue;
      if (item.who === "user") out.push({ id: uid(), kind: "user", text });
      else
        out.push({
          id: uid(),
          kind: "engineer",
          text,
          voiceMeta: `UltraTech Engineer · ${clock((item.endedAt - item.startedAt) / 1000)}`,
        });
    } else if (item.type === "photo") {
      out.push({ id: uid(), kind: "user", text: item.caption, photo: item.photo, photoLabel: "1 photo" });
    } else if (item.type === "video") {
      out.push({ id: uid(), kind: "video", url: item.url, title: item.title });
    } else {
      out.push({ id: uid(), kind: "expert", name: item.name, role: item.role, callSlot: item.callSlot, phone: item.phone });
    }
  }
  if (durationSec < 1 && out.length === 0) return [];
  return [{ id: uid(), kind: "divider", text: `Voice chat duration · ${longDuration(durationSec)}` }, ...out];
}

function newUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? uid("user");
}

function newConversationId(): string {
  return `conv-${newUuid()}`;
}

interface AppContextValue {
  state: State;
  step: OnboardingStep;
  voice: VoiceCall;
  online: boolean | undefined;
  sending: boolean;
  goTo: (screen: Screen) => void;
  openCamera: () => void;
  closeCamera: () => void;
  submitText: (text: string) => void;
  /** Language picked on LanguageScreen: saves it and opens the chat. */
  pickLanguage: (lang: LangChoice) => void;
  chooseLang: (lang: LangChoice) => void;
  chooseStage: (stage: Stage) => void;
  startVoice: () => void;
  /** Leave the call; `summary` adds the PDF card (End chat), plain back / keyboard doesn't. */
  endVoice: (next?: Screen, opts?: { summary?: boolean }) => Promise<void>;
  /** End the text chat in place: ended chip, thank-you, PDF card; composer locks. */
  endChat: () => void;
  capturePhoto: (photo: string) => void;
  clearPendingPhoto: () => void;
  restart: () => void;
  changeLanguage: () => void;
  /** Create the text-chat session early (composer focus) so the first answer starts sooner. */
  warmSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    hydrated: false,
    // Deliberately not saved: every page load starts by asking for the language.
    screen: "language",
    cameraReturn: "chat",
    profile: { uuid: "" },
    messages: openingMessages({ uuid: "" }),
    pendingPhoto: null,
    conversationId: "",
    startedAt: null,
    ended: false,
  });
  const voice = useVoiceCall(state.profile.uuid);
  // Text-chat session, created ahead of the first question (see warmSession) to save a round trip.
  const sessionRef = useRef<Promise<string> | null>(null);
  const ensureSession = useCallback(() => {
    sessionRef.current ??= createSession(state.profile.uuid)
      .then((r) => r.session_id)
      .catch((e: unknown) => {
        sessionRef.current = null;
        throw e;
      });
    return sessionRef.current;
  }, [state.profile.uuid]);

  // Load (or create) the stable per-device profile; the uuid doubles as the LiveKit identity.
  useEffect(() => {
    let profile: Profile = { uuid: "" };
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) profile = JSON.parse(raw) as Profile;
    } catch {
      /* storage blocked: fall through to a fresh profile */
    }
    if (!profile.uuid) profile = { ...profile, uuid: newUuid() };
    dispatch({ type: "hydrate", profile });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
    } catch {
      /* ignore */
    }
  }, [state.hydrated, state.profile]);

  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, refetchInterval: 60_000, retry: 1 });
  const online = health.isPending ? undefined : health.isSuccess && health.data.ok;

  const step = stepOf(state.profile);

  const ask = useMutation({
    mutationFn: async ({ text, replyId }: { text: string; replyId: string }) => {
      const sessionId = await ensureSession();
      let reply = "";
      for await (const ev of streamTurn(sessionId, text)) {
        if (ev.type === "text") {
          reply += ev.delta;
          dispatch({ type: "patch", id: replyId, patch: { text: reply } });
        } else if (ev.type === "audio" || ev.type === "done") {
          // Text is complete once audio synthesis starts; no need to wait for it.
          const final = ev.type === "done" ? ev.text || reply : reply;
          // An empty answer gets the error bubble (with Try again), never a blank one.
          if (!final.trim()) throw new Error("Empty answer");
          dispatch({ type: "patch", id: replyId, patch: { text: final, streaming: false } });
          if (ev.type === "audio") return;
        } else if (ev.type === "error") {
          throw new Error(ev.detail);
        }
      }
    },
    onError: (err, { text, replyId }) => {
      console.warn("[ultratech] text turn failed:", err.message);
      sessionRef.current = null;
      dispatch({
        type: "patch",
        id: replyId,
        patch: {
          streaming: false,
          error: true,
          text: "Sorry, I couldn't get an answer right now. Please try again in a moment.",
          retryText: text,
        },
      });
    },
  });

  const submitText = useCallback(
    (raw: string) => {
      const text = raw.trim();
      const photo = state.pendingPhoto;
      if (state.ended || (!text && !photo)) return;

      if (step === "name") {
        const name = text.replace(/\s+/g, " ").slice(0, 40);
        dispatch({ type: "profile", patch: { name } });
        const lead = state.profile.lang ? `Great, I'll talk with you in ${LANG_LABEL[state.profile.lang]}.` : undefined;
        dispatch({ type: "push", messages: [{ id: uid(), kind: "user", text: name }, stageQuestion(name, lead)] });
        return;
      }

      const replyId = uid();
      const question = text || "I took a photo — can you take a look?";
      dispatch({ type: "pendingPhoto", photo: null });
      dispatch({
        type: "push",
        messages: [
          photo
            ? { id: uid(), kind: "user", text: question, photo, photoLabel: "1 photo" }
            : { id: uid(), kind: "user", text: question },
          { id: replyId, kind: "engineer", text: "", voiceMeta: "UltraTech Engineer", streaming: true },
        ],
      });
      ask.mutate({ text: question, replyId });
    },
    [ask, state.ended, state.pendingPhoto, state.profile.lang, step],
  );

  const pickLanguage = useCallback((lang: LangChoice) => {
    dispatch({ type: "profile", patch: { lang } });
    dispatch({ type: "screen", screen: "chat" });
  }, []);

  const chooseLang = useCallback(
    (lang: LangChoice) => {
      const label = LANG_LABEL[lang];
      dispatch({ type: "profile", patch: { lang } });
      dispatch({
        type: "push",
        messages: [
          { id: uid(), kind: "user", text: label },
          {
            id: uid(),
            kind: "engineer",
            lead: `Great, I'll talk with you in ${label}.`,
            prompt: state.profile.stage
              ? "Ask me anything — tap the mic or type below."
              : `Welcome, ${state.profile.name}! Which stage is your home at right now?`,
            options: state.profile.stage ? undefined : "stage",
          },
        ],
      });
    },
    [state.profile.name, state.profile.stage],
  );

  const chooseStage = useCallback((stage: Stage) => {
    dispatch({ type: "profile", patch: { stage } });
    dispatch({
      type: "push",
      messages: [
        {
          id: uid(),
          kind: "engineer",
          lead: `${stage} stage — got it.`,
          prompt: "Ask me anything: tap the mic to talk, or type your question below.",
        },
      ],
    });
  }, []);

  const startVoice = useCallback(() => {
    dispatch({ type: "screen", screen: "voice" });
    if (voice.status !== "live" && voice.status !== "connecting") void voice.start(backendLang(state.profile.lang));
  }, [voice, state.profile.lang]);

  const endVoice = useCallback(
    async (next: Screen = "chat", opts?: { summary?: boolean }) => {
      const call = await voice.end();
      dispatch({ type: "callEnded", messages: summaryToMessages(call), summary: !!opts?.summary, at: Date.now() });
      dispatch({ type: "screen", screen: next });
    },
    [voice],
  );

  // Stable identities: the composer's action chips shouldn't re-render on every streamed chunk.
  const restart = useCallback(() => {
    sessionRef.current = null;
    dispatch({ type: "reset" });
  }, []);
  const changeLanguage = useCallback(() => dispatch({ type: "push", messages: [langQuestion()] }), []);

  const endChat = useCallback(async () => {
    if (voice.status !== "idle") await endVoice("chat");
    dispatch({ type: "endChat", at: Date.now() });
  }, [voice.status, endVoice]);

  const capturePhoto = useCallback(
    (photo: string) => {
      if (state.cameraReturn === "voice" && voice.status === "live") {
        voice.addPhoto(photo, "I took a photo of the problem.");
      } else {
        dispatch({ type: "pendingPhoto", photo });
      }
      dispatch({ type: "closeCamera" });
    },
    [state.cameraReturn, voice],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      step,
      voice,
      online,
      sending: ask.isPending,
      goTo: (screen) => dispatch({ type: "screen", screen }),
      openCamera: () => dispatch({ type: "openCamera" }),
      closeCamera: () => dispatch({ type: "closeCamera" }),
      submitText,
      pickLanguage,
      chooseLang,
      chooseStage,
      startVoice,
      endVoice,
      endChat,
      capturePhoto,
      clearPendingPhoto: () => dispatch({ type: "pendingPhoto", photo: null }),
      restart,
      changeLanguage,
      warmSession: () => {
        if (step === "done" && state.profile.uuid) ensureSession().catch(() => {});
      },
    }),
    [state, step, voice, online, ask.isPending, submitText, pickLanguage, chooseLang, chooseStage, startVoice, endVoice, endChat, capturePhoto, ensureSession, restart, changeLanguage],
  );

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

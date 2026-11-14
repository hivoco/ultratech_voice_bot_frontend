"use client";

import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { askImageTurn, askTurn, createSession, fetchHealth } from "./api";
import { capFirst, capSentences, clock, longDuration, plainText, stringList, uid } from "./id";
import { backendLang, LANG_LABEL, type ChatMessage, type Suggestions, type LangChoice, type Profile, type Screen, type Stage } from "./types";
import { turnText, useVoiceCall, type CallSummary, type VoiceCall } from "./useVoiceCall";
import { buildTranscript } from "./transcript";
import { initSfx, playSfx } from "./sfx";
import { answersText, parseReplyUi, type UiAnswers } from "./replyUi";
import { parseContact, type ContactChannels } from "./contact";
import type { QuizLabels } from "@/components/chat/ReplyBlocks";

const PROFILE_KEY = "ultratech.profile.v1";

/** Ids of the opening bubbles (stable: part of the initial state, so server and client agree). */
export const GREETING_ID = "greeting";
export const GREETING_LANG_ID = "greeting-lang";

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
  /** Change language: ask again, unless the newest message already is that question. */
  | { type: "askLang" }
  /** Language picked in the chat: saved, plus the user bubble and the reply (stage question or not). */
  | { type: "chooseLang"; lang: LangChoice }
  /** Stage picked: saved, plus the "got it" reply (the stage reaches the AI on `/session`). */
  | { type: "chooseStage"; stage: Stage }
  | { type: "reset" };

/**
 * The engineer's onboarding lines in the chosen language. Hindi is Devanagari with construction
 * words kept in Roman ("stage", "mic"), like the bot's own answers; Hinglish is Roman Hindi.
 * The greeting and first language card stay English: they come before a language is picked.
 */
const ONBOARDING: Record<
  LangChoice,
  {
    great: string;
    stage: string;
    gotStage: (s: Stage) => string;
    askAnything: string;
    changeLang: string;
    /** Heading over suggested follow-up questions under an answer. */
    suggestions: string;
    /** Heading when the backend's key points are statements, not questions. */
    moreTitle: string;
    /** What tapping a statement sends: asks for more on it, so the bot doesn't just repeat itself. */
    tellMore: (point: string) => string;
    /** Site-engineer card after a photo the backend flags as serious. */
    escalation: string;
    /** What to do meanwhile, on that card (shown even when the backend sends no contact). */
    escalationNote: string;
    /** Buttons on choice / quiz cards. */
    quiz: QuizLabels;
  }
> = {
  en: {
    great: "Great, I'll talk with you in English.",
    stage: "Which stage is your home at right now?",
    gotStage: (s) => `${s} stage — got it.`,
    suggestions: "At this stage, people often ask",
    moreTitle: "Tap to know more",
    tellMore: (p) => `Tell me more about this: ${p}`,
    escalation: "A site engineer should check this",
    escalationNote: "Pause work on this part and get a qualified expert to inspect it on site before you continue.",
    quiz: { next: "Next", send: "Send", back: "Back", pickAll: "Pick all that apply" },
    askAnything: "Ask me anything: tap the mic to talk, or type your question below.",
    changeLang: "Which language would you like to talk in?",
  },
  hi: {
    great: "बढ़िया, अब मैं आपसे हिंदी में बात करूँगा।",
    stage: "आपका घर अभी किस stage पर है?",
    gotStage: (s) => `ठीक है, ${s} stage.`,
    suggestions: "इस stage पर लोग अक्सर पूछते हैं",
    moreTitle: "और जानने के लिए tap करें",
    tellMore: (p) => `${p} — इसके बारे में और बताइए`,
    escalation: "इसे site engineer से check करवाएँ",
    escalationNote: "इस हिस्से का काम रोकिए और आगे बढ़ने से पहले qualified expert से site पर जाँच करवाइए।",
    quiz: { next: "आगे", send: "भेजें", back: "पीछे", pickAll: "जो भी लागू हों, सब चुनिए" },
    askAnything: "कुछ भी पूछिए: बोलने के लिए mic दबाएँ, या नीचे लिखें।",
    changeLang: "आप किस भाषा में बात करना चाहेंगे?",
  },
  hinglish: {
    great: "Badhiya, ab main aapse Hinglish mein baat karunga.",
    stage: "Aapka ghar abhi kis stage par hai?",
    gotStage: (s) => `Theek hai, ${s} stage.`,
    suggestions: "Is stage par log aksar poochte hain",
    moreTitle: "Aur jaanne ke liye tap kariye",
    tellMore: (p) => `${p} — iske baare mein aur bataiye`,
    escalation: "Ise site engineer se check karwayein",
    escalationNote: "Is hisse ka kaam rokiye aur aage badhne se pehle qualified expert se site par jaanch karwaiye.",
    quiz: { next: "Aage", send: "Bhejiye", back: "Peeche", pickAll: "Jo bhi laagu hon, sab chuniye" },
    askAnything: "Kuch bhi poochiye: bolne ke liye mic dabaiye, ya neeche type kariye.",
    changeLang: "Aap kis language mein baat karna chahenge?",
  },
};
const copyFor = (lang: LangChoice | undefined) => ONBOARDING[lang ?? "en"] ?? ONBOARDING.en;

/** Choice / quiz button labels in the chat's language. */
export const quizLabelsFor = (lang: LangChoice | undefined): QuizLabels => copyFor(lang).quiz;

/**
 * The site-engineer card for a serious reply (chat photo, typed turn or call escalation). Shows the
 * backend's contact channels when it sends them; otherwise just the localized "what to do now" note,
 * never a button that can't do anything.
 */
function escalationCard(lang: LangChoice | undefined, condition: string, contact: ContactChannels & { name?: string; role?: string }, fromPhoto: boolean): ChatMessage {
  const copy = copyFor(lang);
  // Backend condition codes are snake_case ("structural_diagonal_crack"); show them as words.
  condition = condition.replace(/[_-]+/g, " ").trim();
  return {
    id: uid("esc"),
    kind: "expert",
    name: contact.name ?? copy.escalation,
    role: contact.role ?? (condition ? `${fromPhoto ? "Photo" : "Issue"}: ${condition}` : fromPhoto ? "From your photo" : ""),
    note: copy.escalationNote,
    callSlot: contact.callSlot,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    email: contact.email,
    bookingUrl: contact.bookingUrl,
  };
}

const QUESTION_END = /[?？]\s*$/;

/**
 * The buttons under an answer. Uses the backend's follow-up questions when it sends them, else its
 * key points. Key points are usually statements summarising the answer just given ("Cover fresh
 * concrete with tarpaulin"): sent as-is, the bot only repeats itself, so those get a "tap to know
 * more" heading and a tap asks for more on that point.
 */
function buildSuggestions(res: { key_points?: unknown; suggested_questions?: unknown }, lang: LangChoice | undefined): Suggestions | undefined {
  // Untrusted shapes: anything that isn't a list of strings counts as none.
  const questions = stringList(res.suggested_questions, 3);
  const list = (questions.length ? questions : stringList(res.key_points)).map((k) => capFirst(plainText(k).trim())).filter(Boolean).slice(0, 3);
  if (!list.length) return undefined;
  const copy = copyFor(lang);
  const asks = questions.length > 0 || list.every((k) => QUESTION_END.test(k));
  return {
    title: asks ? copy.suggestions : copy.moreTitle,
    items: list.map((label) => ({ label, send: asks ? label : copy.tellMore(label) })),
  };
}

/** Bubble text for a photo sent without a note (not sent to the AI as a caption). */
const PHOTO_ONLY_TEXT = "I took a photo — can you take a look?";

/** A chat turn: typed text, or a photo (data URL) with what the user typed as its caption. */
interface AskVars {
  text: string;
  replyId: string;
  photo?: string;
  caption?: string;
  answers?: UiAnswers;
  /** The conversation the question was asked in; a late answer for an older one is dropped. */
  conversationId: string;
}

/**
 * v5 "01 · Welcome": the greeting asks for the language in the chat (every load, a separate card
 * with the chips); the language reply then asks for the stage (see chooseLang). No name step.
 */
function openingMessages(): ChatMessage[] {
  return [
    {
      id: GREETING_ID,
      kind: "engineer",
      voiceMeta: "UltraTech Engineer",
      // Same for new and returning users, as in the design; the saved stage shows as the ticked chip.
      lead: "Namaste! I'm your UltraTech Home-Building Expert. Building a home is a big decision, and I'm with you at every step.",
      prompt: "Which language is easiest for you?",
    },
    { id: GREETING_LANG_ID, kind: "engineer", prompt: "Tap one — you can change it anytime.", options: "lang" },
  ];
}

const langQuestion = (lang: LangChoice | undefined): ChatMessage => ({
  id: uid(),
  kind: "engineer",
  prompt: copyFor(lang).changeLang,
  options: "lang",
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        hydrated: true,
        profile: action.profile,
        messages: openingMessages(),
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
    case "chooseLang": {
      // After End chat the old option cards are history; only Start a new chat continues.
      if (state.ended) return state;
      const copy = copyFor(action.lang);
      // v5 "01 · Welcome": the language reply asks the stage (saved stage ticked) until it's chosen in
      // this conversation (a "got it" reply, id prefix "stage") or the chat has real answers. So
      // switching language before picking a stage re-asks it, a mid-chat change doesn't.
      const askStage = !state.messages.some((m) => m.kind === "engineer" && (m.id.startsWith("stage-") || !!m.text));
      const reply: ChatMessage = {
        id: uid(),
        kind: "engineer",
        lead: copy.great,
        prompt: askStage ? copy.stage : copy.askAnything,
        options: askStage ? "stage" : undefined,
      };
      return {
        ...state,
        profile: { ...state.profile, lang: action.lang },
        startedAt: state.startedAt ?? Date.now(),
        messages: [...state.messages, { id: uid(), kind: "user", text: LANG_LABEL[action.lang] }, reply],
      };
    }
    case "chooseStage": {
      if (state.ended) return state;
      const copy = copyFor(state.profile.lang);
      return {
        ...state,
        profile: { ...state.profile, stage: action.stage },
        messages: [
          ...state.messages,
          { id: uid("stage"), kind: "engineer", lead: copy.gotStage(action.stage), prompt: copy.askAnything },
        ],
      };
    }
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
    case "askLang": {
      const last = state.messages.at(-1);
      if (last?.kind === "engineer" && last.options === "lang") return state;
      return { ...state, messages: [...state.messages, langQuestion(state.profile.lang)] };
    }
    case "reset":
      return {
        ...state,
        // A new conversation starts with no language or stage ticked, like a page load.
        profile: { uuid: state.profile.uuid },
        screen: "chat",
        pendingPhoto: null,
        messages: openingMessages(),
        conversationId: newConversationId(),
        startedAt: null,
        ended: false,
      };
  }
}

/** Turn a finished call's timeline into chat transcript messages. */
function summaryToMessages({ timeline, durationSec }: CallSummary, lang: LangChoice | undefined): ChatMessage[] {
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
    } else if (item.type === "escalation") {
      out.push(escalationCard(lang, item.condition, item.contact ?? {}, true));
    } else {
      out.push({
        id: uid(),
        kind: "expert",
        name: item.name,
        role: item.role,
        callSlot: item.callSlot,
        phone: item.phone,
        whatsapp: item.whatsapp,
        email: item.email,
        bookingUrl: item.bookingUrl,
      });
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
  voice: VoiceCall;
  online: boolean | undefined;
  sending: boolean;
  goTo: (screen: Screen) => void;
  openCamera: () => void;
  closeCamera: () => void;
  /** `retryPhoto`: resend a failed photo turn with its photo. */
  submitText: (text: string, retryPhoto?: string, answers?: UiAnswers) => void;
  /** Send the picks on a choice / quiz card as the user's next message. */
  answerUi: (messageId: string, answers: UiAnswers) => void;
  /** Language picked on LanguageScreen (not shown since v5): saves it and opens the chat. */
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
    // v5: the chat opens first and asks for the language itself. To bring back the old full-screen
    // picker (LanguageScreen, commented out in VoiceBotApp), start on "language" again.
    screen: "chat",
    cameraReturn: "chat",
    profile: { uuid: "" },
    messages: openingMessages(),
    pendingPhoto: null,
    conversationId: "",
    startedAt: null,
    ended: false,
  });
  const voice = useVoiceCall(state.profile.uuid);
  // Latest state for callbacks that must keep a stable identity (memoized chat rows get them as
  // props: a new function on every message would re-render every row) and for async work that
  // has to know whether the conversation it started in is still the current one.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  // Text-chat session, created ahead of the first question (see warmSession) to save a round trip.
  // It carries the picked stage, so the AI is stage-aware from turn 1 (`/session {stage}`). The
  // composer only unlocks after the stage is picked, so the session never starts without it.
  const sessionRef = useRef<Promise<string> | null>(null);
  const ensureSession = useCallback(() => {
    sessionRef.current ??= createSession(state.profile.uuid, state.profile.stage)
      .then((r) => r.session_id)
      .catch((e: unknown) => {
        sessionRef.current = null;
        throw e;
      });
    return sessionRef.current;
  }, [state.profile.uuid, state.profile.stage]);

  // Load (or create) the stable per-device profile; the uuid doubles as the LiveKit identity.
  // UI sounds unlock on the first tap (browser autoplay rules).
  useEffect(() => initSfx(), []);

  useEffect(() => {
    let profile: Profile = { uuid: "" };
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        // Only the device id is restored. Language and stage are never pre-selected: each conversation
        // starts with nothing ticked, and a choice counts (and is sent) only once the user taps it.
        // A corrupted saved value is ignored.
        const saved = JSON.parse(raw) as Partial<Record<keyof Profile, unknown>> | null;
        const uuid = typeof saved?.uuid === "string" && /^[A-Za-z0-9-]{8,64}$/.test(saved.uuid) ? saved.uuid : "";
        profile = { uuid };
      }
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

  const ask = useMutation({
    // Typing dots show until the whole answer arrives (~1–3 s), in the picked language's script.
    // With a photo: `/turn/image` (caption = what the user typed, if anything).
    mutationFn: async ({ text, replyId, photo, caption, answers, conversationId }: AskVars) => {
      const sessionId = await ensureSession();
      const res = photo
        ? await askImageTurn(sessionId, photo, caption ?? "", state.profile.lang)
        : await askTurn(sessionId, text, state.profile.lang, answers);
      // The user started a new chat while this was in flight: drop the late answer (and its card).
      if (stateRef.current.conversationId !== conversationId) return;
      const answer = typeof res.text === "string" ? res.text : "";
      const ui = parseReplyUi(res.ui);
      // An empty answer gets the error bubble (with Try again), never a blank one.
      if (!answer.trim()) throw new Error("Empty answer");
      dispatch({
        type: "patch",
        id: replyId,
        patch: {
          text: state.profile.lang === "hinglish" ? capSentences(answer) : answer,
          streaming: false,
          // A question card replaces the follow-up buttons (two sets of taps would compete).
          suggestions: ui?.type === "choice" || ui?.type === "quiz" ? undefined : buildSuggestions(res, state.profile.lang),
          ui: ui ?? undefined,
        },
      });
      // A reply the backend flags as serious (photo or typed) gets the site-engineer card under it.
      if (res.serious === true) {
        const condition = "condition" in res && typeof res.condition === "string" ? res.condition : "";
        dispatch({ type: "push", messages: [escalationCard(state.profile.lang, condition, parseContact(res.contact), !!photo)] });
      }
    },
    onError: (err, { text, replyId, photo, answers, conversationId }) => {
      console.warn("[ultratech] text turn failed:", err.message);
      if (stateRef.current.conversationId !== conversationId) return;
      sessionRef.current = null;
      dispatch({
        type: "patch",
        id: replyId,
        patch: {
          streaming: false,
          error: true,
          text: "Sorry, I couldn't get an answer right now. Please try again in a moment.",
          retryText: text,
          retryPhoto: photo,
          retryAnswers: answers,
        },
      });
    },
  });

  const { mutate: askMutate, reset: askReset } = ask;
  const submitText = useCallback(
    (raw: string, retryPhoto?: string, answers?: UiAnswers) => {
      const state = stateRef.current;
      const text = raw.trim();
      // Quiz answers are a reply on their own: a photo waiting in the composer stays there.
      const photo = answers ? undefined : (retryPhoto ?? state.pendingPhoto);
      if (state.ended || (!text && !photo)) return;

      const replyId = uid();
      const question = text || PHOTO_ONLY_TEXT;
      playSfx("send");
      if (photo) dispatch({ type: "pendingPhoto", photo: null });
      dispatch({
        type: "push",
        messages: [
          photo
            ? { id: uid(), kind: "user", text: question, photo, photoLabel: "1 photo" }
            : { id: uid(), kind: "user", text: question },
          { id: replyId, kind: "engineer", text: "", voiceMeta: "UltraTech Engineer", streaming: true },
        ],
      });
      // The caption is only what the user typed (a retry of a photo-only turn resends the stand-in text).
      const caption = text === PHOTO_ONLY_TEXT ? "" : text;
      const conversationId = state.conversationId;
      askMutate(photo ? { text: question, replyId, photo, caption, conversationId } : { text: question, replyId, answers, conversationId });
    },
    [askMutate],
  );

  const answerUi = useCallback(
    (messageId: string, answers: UiAnswers) => {
      const m = stateRef.current.messages.find((x) => x.id === messageId);
      // Once only: the card turns read-only with these picks.
      if (!m || m.kind !== "engineer" || !m.ui || m.uiAnswers) return;
      dispatch({ type: "patch", id: messageId, patch: { uiAnswers: answers } });
      submitText(answersText(m.ui, answers), undefined, answers);
    },
    [submitText],
  );
  const openCamera = useCallback(() => dispatch({ type: "openCamera" }), []);

  const pickLanguage = useCallback((lang: LangChoice) => {
    dispatch({ type: "profile", patch: { lang } });
    dispatch({ type: "screen", screen: "chat" });
  }, []);

  // Stable callbacks (the logic lives in the reducer): the memoized message rows get them as props,
  // so a new identity on every pick would re-render every option bubble.
  const chooseLang = useCallback((lang: LangChoice) => dispatch({ type: "chooseLang", lang }), []);
  const chooseStage = useCallback((stage: Stage) => dispatch({ type: "chooseStage", stage }), []);

  const startVoice = useCallback(() => {
    dispatch({ type: "screen", screen: "voice" });
    if (voice.status !== "live" && voice.status !== "connecting") void voice.start(backendLang(state.profile.lang), { stage: state.profile.stage, uiLang: state.profile.lang });
  }, [voice, state.profile.lang, state.profile.stage]);

  const endVoice = useCallback(
    async (next: Screen = "chat", opts?: { summary?: boolean }) => {
      const call = await voice.end();
      dispatch({ type: "callEnded", messages: summaryToMessages(call, state.profile.lang), summary: !!opts?.summary, at: Date.now() });
      dispatch({ type: "screen", screen: next });
    },
    [voice, state.profile.lang],
  );

  // Stable identities: the composer's action chips shouldn't re-render on every streamed chunk.
  const restart = useCallback(() => {
    sessionRef.current = null;
    // A question still in flight belongs to the old chat: free the composer now.
    askReset();
    dispatch({ type: "reset" });
  }, [askReset]);
  const changeLanguage = useCallback(() => dispatch({ type: "askLang" }), []);

  const endChat = useCallback(async () => {
    if (voice.status !== "idle") await endVoice("chat");
    dispatch({ type: "endChat", at: Date.now() });
  }, [voice.status, endVoice]);

  const capturePhoto = useCallback(
    (photo: string) => {
      if (state.cameraReturn === "voice" && voice.status === "live") {
        voice.addPhoto(photo, "I took a photo of the problem.", {
          lang: backendLang(state.profile.lang),
          stage: state.profile.stage,
        });
      } else {
        dispatch({ type: "pendingPhoto", photo });
      }
      dispatch({ type: "closeCamera" });
    },
    [state.cameraReturn, voice, state.profile.lang, state.profile.stage],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      voice,
      online,
      sending: ask.isPending,
      goTo: (screen) => dispatch({ type: "screen", screen }),
      openCamera,
      closeCamera: () => dispatch({ type: "closeCamera" }),
      submitText,
      answerUi,
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
        if (state.profile.uuid) ensureSession().catch(() => {});
      },
    }),
    [state, voice, online, ask.isPending, submitText, answerUi, openCamera, pickLanguage, chooseLang, chooseStage, startVoice, endVoice, endChat, capturePhoto, ensureSession, restart, changeLanguage],
  );

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp(): AppContextValue {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

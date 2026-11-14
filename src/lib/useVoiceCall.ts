"use client";

import { parseContact, type ContactChannels } from "./contact";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
// Types only: the livekit-client runtime (~200 KB) is loaded on demand when a call starts.
import type { Participant, RemoteAudioTrack, RemoteTrack, Room, TranscriptionSegment } from "livekit-client";
import { fetchVoiceToken, sendVoicePhoto } from "./api";
import { uid } from "./id";
import type { ExpertContact } from "./types";

export type CallStatus = "idle" | "connecting" | "live" | "error";
export type CallPhase = "connecting" | "listening" | "thinking" | "speaking";
export type CallErrorKind = "mic" | "connect" | "dropped";

interface Segment {
  text: string;
  final: boolean;
}

export interface VoiceTurn {
  type: "turn";
  id: string;
  who: "user" | "agent";
  order: string[];
  segs: Record<string, Segment>;
  startedAt: number;
  endedAt: number;
}

export type TimelineItem =
  | VoiceTurn
  | { type: "video"; id: string; url: string; title: string }
  | { type: "photo"; id: string; photo: string; caption: string }
  /** The worker flagged a call photo as serious: show the site-engineer card. */
  | { type: "escalation"; id: string; condition: string; contact?: ContactChannels & { name?: string; role?: string } }
  | ({ type: "expert"; id: string } & ExpertContact);

export interface CallSummary {
  timeline: TimelineItem[];
  durationSec: number;
}

/** "lk.agent.state" attribute published by LiveKit Agents 1.x workers. */
type AgentState = "initializing" | "listening" | "thinking" | "speaking";

/** Validate an agent data message into a timeline card; untrusted JSON in, typed item or null out. */
function parseCard(topic: "video" | "expert", data: Record<string, unknown>): TimelineItem | null {
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);
  if (topic === "video") {
    const url = str(data.url, 2000);
    if (!url) return null;
    try {
      if (new URL(url).protocol !== "https:") return null;
    } catch {
      return null;
    }
    return { type: "video", id: uid("v"), url, title: str(data.title) ?? "" };
  }
  const { name, role, ...channels } = parseContact(data);
  if (!name) return null;
  return { type: "expert", id: uid("x"), name, role: role ?? "", ...channels };
}

/**
 * Merge LiveKit transcription segments into the call timeline.
 * - A segment that is already in a turn is updated in place, even when other turns started since
 *   (LiveKit can send a late final for the greeting after the caller began talking). Treating it
 *   as new duplicated the greeting and the question in the transcript and the PDF.
 * - A final segment replaces the interim segments before it in its turn: speech-to-text may send
 *   the final under a new id, and the stale interim (e.g. "आफ्टर द") must not stay behind.
 * - Other new segments go to the last turn when it is the same speaker's, else start a new turn.
 */
export function applySegments(
  prev: TimelineItem[],
  who: "user" | "agent",
  segments: { id: string; text: string; final: boolean }[],
  now: number,
): TimelineItem[] {
  const next = [...prev];
  const editable = (idx: number): VoiceTurn => {
    const t = next[idx] as VoiceTurn;
    if (prev[idx] !== t) return t; // already copied in this call
    const copy = { ...t, segs: { ...t.segs }, order: [...t.order] };
    next[idx] = copy;
    return copy;
  };
  const put = (turn: VoiceTurn, seg: { id: string; text: string; final: boolean }, live = true) => {
    if (!(seg.id in turn.segs)) turn.order.push(seg.id);
    turn.segs[seg.id] = { text: seg.text, final: seg.final };
    if (seg.final) {
      const at = turn.order.indexOf(seg.id);
      const stale = turn.order.slice(0, at).filter((k) => !turn.segs[k].final);
      for (const k of stale) delete turn.segs[k];
      turn.order = turn.order.filter((k) => k in turn.segs);
    }
    // A late update to an older turn must not stretch its duration ("UltraTech Engineer · 0:12").
    if (live) turn.endedAt = now;
  };
  for (const seg of segments) {
    const owner = next.findLastIndex((t) => t.type === "turn" && t.who === who && seg.id in t.segs);
    if (owner >= 0) {
      put(editable(owner), seg, owner === next.length - 1);
      continue;
    }
    const lastIdx = next.length - 1;
    const last = next[lastIdx];
    if (last?.type === "turn" && last.who === who) put(editable(lastIdx), seg);
    else {
      const turn: VoiceTurn = { type: "turn", id: uid("t"), who, order: [], segs: {}, startedAt: now, endedAt: now };
      next.push(turn);
      put(turn, seg);
    }
  }
  return next;
}

export function turnText(turn: VoiceTurn) {
  const finalText = turn.order.filter((k) => turn.segs[k].final).map((k) => turn.segs[k].text);
  const interim = turn.order.filter((k) => !turn.segs[k].final).map((k) => turn.segs[k].text);
  return { final: finalText.join(" ").trim(), interim: interim.join(" ").trim() };
}

export function useVoiceCall(userUuid: string) {
  const roomRef = useRef<Room | null>(null);
  /** Bumped by every start()/end(): a start() that is no longer current gives up after its awaits. */
  const genRef = useRef(0);
  const agentTracksRef = useRef<RemoteAudioTrack[]>([]);
  const startedAtRef = useRef(0);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [errorKind, setErrorKind] = useState<CallErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  /** A call photo is being checked (upload + classify + reply), ~10–20 s. */
  const [photoPending, setPhotoPending] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  // Source of truth for event handlers and end(); kept in sync synchronously so a segment that
  // lands right before end() is never lost to a pending state update.
  const timelineRef = useRef<TimelineItem[]>([]);
  const updateTimeline = useCallback((fn: (prev: TimelineItem[]) => TimelineItem[]) => {
    timelineRef.current = fn(timelineRef.current);
    setTimeline(timelineRef.current);
  }, []);

  const tokenMutation = useMutation({
    mutationFn: ({ lang, stage, uiLang }: { lang: "en" | "hi"; stage?: string; uiLang?: string }) =>
      fetchVoiceToken(userUuid, lang, { stage, uiLang }),
  });

  const upsertSegments = useCallback((who: "user" | "agent", segments: TranscriptionSegment[]) => {
    const now = performance.now();
    const last = timelineRef.current.at(-1);
    if (who === "agent" && !(last?.type === "turn" && last.who === "agent")) {
      // A fresh agent turn (e.g. after a tap-to-interrupt): restore playback volume.
      agentTracksRef.current.forEach((t) => t.setVolume(1));
      setInterrupted(false);
    }
    updateTimeline((prev) => applySegments(prev, who, segments, now));
  }, [updateTimeline]);

  const teardown = useCallback(() => {
    agentTracksRef.current.forEach((t) => t.detach().forEach((el) => el.remove()));
    agentTracksRef.current = [];
    roomRef.current = null;
    setAgentState(null);
    setAgentSpeaking(false);
    setInterrupted(false);
  }, []);

  const start = useCallback(
    async (lang: "en" | "hi", opts?: { stage?: string; uiLang?: string }) => {
      if (roomRef.current) return;
      // Each start/end bumps the generation. After every await, a start whose generation is no
      // longer current (the user left, or tapped again) stops: otherwise a call ended while still
      // connecting would go live in the background with the mic open.
      const gen = ++genRef.current;
      const stale = () => gen !== genRef.current;
      setStatus("connecting");
      setErrorKind(null);
      setErrorDetail("");
      updateTimeline(() => []);
      setMicEnabled(true);

      let token;
      let lk: typeof import("livekit-client");
      try {
        [token, lk] = await Promise.all([tokenMutation.mutateAsync({ lang, ...opts }), import("livekit-client")]);
      } catch (e) {
        if (stale()) return;
        setStatus("error");
        setErrorKind("connect");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }
      if (stale()) return;

      const { Room, RoomEvent, Track } = lk;
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          if (track.kind !== Track.Kind.Audio) return;
          const audioTrack = track as RemoteAudioTrack;
          agentTracksRef.current.push(audioTrack);
          const el = audioTrack.attach();
          el.hidden = true;
          document.body.appendChild(el);
        })
        .on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], participant?: Participant) => {
          const isAgent = !!participant?.identity && participant.identity !== userUuid;
          upsertSegments(isAgent ? "agent" : "user", segments);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          setAgentSpeaking(speakers.some((p) => p.identity !== userUuid));
        })
        .on(RoomEvent.ParticipantAttributesChanged, (changed: Record<string, string>, participant: Participant) => {
          if (participant.identity === userUuid) return;
          const state = changed["lk.agent.state"];
          if (state) setAgentState(state as AgentState);
        })
        .on(RoomEvent.DataReceived, (payload: Uint8Array, sender?: Participant, _k?: unknown, topic?: string) => {
          // Cards may only come from the agent worker, never from another participant.
          if ((topic !== "video" && topic !== "expert" && topic !== "escalation") || !sender?.isAgent) return;
          try {
            const data = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
            if (topic === "escalation") {
              const condition = typeof data.condition === "string" ? data.condition.slice(0, 60) : "";
              // Optional `contact` (docs/backend-fixes.md item 9): phone / WhatsApp / email / booking link.
              const contact = parseContact(data.contact);
              updateTimeline((prev) => [...prev, { type: "escalation", id: uid("x"), condition, contact }]);
              return;
            }
            const item = parseCard(topic, data);
            if (item) updateTimeline((prev) => [...prev, item]);
          } catch {
            /* ignore malformed data messages */
          }
        })
        .on(RoomEvent.Disconnected, () => {
          // Unexpected drop (agent left / network). A user-initiated end() clears roomRef first.
          if (roomRef.current === room) {
            teardown();
            setStatus("error");
            setErrorKind("dropped");
          }
        });

      try {
        await room.connect(token.url, token.token);
      } catch (e) {
        if (stale()) return; // end() already disconnected and tore down
        teardown();
        setStatus("error");
        setErrorKind("connect");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }
      if (stale()) {
        void room.disconnect().catch(() => {});
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (e) {
        if (stale()) return;
        roomRef.current = null;
        await room.disconnect();
        teardown();
        setStatus("error");
        setErrorKind("mic");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }
      if (stale()) {
        void room.disconnect().catch(() => {});
        return;
      }
      startedAtRef.current = performance.now();
      setStatus("live");
    },
    [tokenMutation, teardown, upsertSegments, updateTimeline, userUuid],
  );

  /** End the call and hand back everything that was said, for the chat transcript. */
  const end = useCallback(async (): Promise<CallSummary> => {
    genRef.current++; // cancels a start() that is still connecting
    const room = roomRef.current;
    const durationSec = startedAtRef.current ? (performance.now() - startedAtRef.current) / 1000 : 0;
    startedAtRef.current = 0;
    roomRef.current = null;
    if (room) await room.disconnect().catch(() => {});
    teardown();
    setStatus("idle");
    setErrorKind(null);
    const summary: CallSummary = { timeline: timelineRef.current, durationSec };
    updateTimeline(() => []);
    return summary;
  }, [teardown, updateTimeline]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch (e) {
      // e.g. mic permission revoked mid-call: say so instead of an unhandled rejection.
      setErrorKind("mic");
      setErrorDetail(e instanceof Error ? e.message : String(e));
    }
  }, []);

  /**
   * Tap-the-orb interrupt. The worker already supports voice barge-in, so locally we silence
   * the current answer and make sure the mic is open. We also publish a "control" message so
   * the worker can call session.interrupt() once it listens for it (see docs/02-voice-call.md).
   */
  const interrupt = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    agentTracksRef.current.forEach((t) => t.setVolume(0));
    setInterrupted(true);
    if (!room.localParticipant.isMicrophoneEnabled) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicEnabled(true);
      } catch (e) {
        setErrorKind("mic");
        setErrorDetail(e instanceof Error ? e.message : String(e));
      }
    }
    const payload = new TextEncoder().encode(JSON.stringify({ type: "interrupt" }));
    room.localParticipant.publishData(payload, { reliable: true, topic: "control" }).catch(() => {});
  }, []);

  /**
   * A photo taken during the call: shown in the transcript, sent to `/api/voice/photo`, and the
   * returned reply relayed to the worker on the "voice_photo" topic so the bot speaks it (the
   * worker then sends an "escalation" card if it's serious). Failures only log: the call goes on.
   */
  const addPhoto = useCallback(
    (photo: string, caption: string, opts: { lang: "en" | "hi"; stage?: string }) => {
      updateTimeline((prev) => [...prev, { type: "photo", id: uid("p"), photo, caption }]);
      const room = roomRef.current;
      setPhotoPending(true);
      void sendVoicePhoto(photo, { caption: "", lang: opts.lang, stage: opts.stage, room: room?.name })
        .then((res) => {
          if (!res.reply || roomRef.current !== room || !room) return;
          const payload = new TextEncoder().encode(
            JSON.stringify({ reply: res.reply, serious: res.serious, condition: res.condition, query: res.query }),
          );
          return room.localParticipant.publishData(payload, { reliable: true, topic: "voice_photo" });
        })
        .catch((e: unknown) => console.warn("[ultratech] voice photo failed:", e instanceof Error ? e.message : e))
        .finally(() => setPhotoPending(false));
    },
    [updateTimeline],
  );

  useEffect(
    () => () => {
      genRef.current++;
      void roomRef.current?.disconnect().catch(() => {});
    },
    [],
  );

  let lastTurn: VoiceTurn | undefined;
  let lastUserTurn: VoiceTurn | undefined;
  let lastAgentTurn: VoiceTurn | undefined;
  for (let i = timeline.length - 1; i >= 0 && !(lastUserTurn && lastAgentTurn); i--) {
    const t = timeline[i];
    if (t.type !== "turn") continue;
    lastTurn ??= t;
    if (t.who === "user") lastUserTurn ??= t;
    else lastAgentTurn ??= t;
  }
  const lastTurnText = lastTurn ? turnText(lastTurn) : null;

  let phase: CallPhase = "listening";
  if (status === "connecting") phase = "connecting";
  else if (interrupted) phase = "listening";
  else if (agentState === "speaking" || (agentState === null && agentSpeaking)) phase = "speaking";
  else if (agentState === "thinking") phase = "thinking";
  else if (agentState === null && lastTurn?.who === "user" && lastTurnText?.interim === "" && lastTurnText.final)
    phase = "thinking";

  return {
    status,
    phase,
    errorKind,
    errorDetail,
    micEnabled,
    photoPending,
    timeline,
    lastTurn,
    lastUserTurn,
    lastAgentTurn,
    start,
    end,
    toggleMic,
    interrupt,
    addPhoto,
  };
}

export type VoiceCall = ReturnType<typeof useVoiceCall>;

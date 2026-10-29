"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
// Types only: the livekit-client runtime (~200 KB) is loaded on demand when a call starts.
import type { Participant, RemoteAudioTrack, RemoteTrack, Room, TranscriptionSegment } from "livekit-client";
import { fetchVoiceToken } from "./api";
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
  | ({ type: "expert"; id: string } & ExpertContact);

export interface CallSummary {
  timeline: TimelineItem[];
  durationSec: number;
}

/** "lk.agent.state" attribute published by LiveKit Agents 1.x workers. */
type AgentState = "initializing" | "listening" | "thinking" | "speaking";

export function turnText(turn: VoiceTurn) {
  const finalText = turn.order.filter((k) => turn.segs[k].final).map((k) => turn.segs[k].text);
  const interim = turn.order.filter((k) => !turn.segs[k].final).map((k) => turn.segs[k].text);
  return { final: finalText.join(" ").trim(), interim: interim.join(" ").trim() };
}

export function useVoiceCall(userUuid: string) {
  const roomRef = useRef<Room | null>(null);
  const agentTracksRef = useRef<RemoteAudioTrack[]>([]);
  const startedAtRef = useRef(0);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [errorKind, setErrorKind] = useState<CallErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [interrupted, setInterrupted] = useState(false);
  // Mirror of `timeline` for event handlers and end(), which run outside render.
  const timelineRef = useRef<TimelineItem[]>([]);
  useEffect(() => {
    timelineRef.current = timeline;
  }, [timeline]);

  const tokenMutation = useMutation({
    mutationFn: (lang: "en" | "hi") => fetchVoiceToken(userUuid, lang),
  });

  const upsertSegments = useCallback((who: "user" | "agent", segments: TranscriptionSegment[]) => {
    const now = performance.now();
    const last = timelineRef.current.at(-1);
    if (who === "agent" && !(last?.type === "turn" && last.who === "agent")) {
      // A fresh agent turn (e.g. after a tap-to-interrupt): restore playback volume.
      agentTracksRef.current.forEach((t) => t.setVolume(1));
      setInterrupted(false);
    }
    setTimeline((prev) => {
      const next = [...prev];
      const lastIdx = next.findLastIndex((t) => t.type === "turn");
      const last = lastIdx >= 0 ? (next[lastIdx] as VoiceTurn) : null;
      let turn: VoiceTurn;
      if (last && last.who === who && lastIdx === next.length - 1) {
        turn = { ...last, segs: { ...last.segs }, order: [...last.order] };
        next[lastIdx] = turn;
      } else {
        turn = { type: "turn", id: uid("t"), who, order: [], segs: {}, startedAt: now, endedAt: now };
        next.push(turn);
      }
      for (const seg of segments) {
        if (!(seg.id in turn.segs)) turn.order.push(seg.id);
        turn.segs[seg.id] = { text: seg.text, final: seg.final };
      }
      turn.endedAt = now;
      return next;
    });
  }, []);

  const teardown = useCallback(() => {
    agentTracksRef.current.forEach((t) => t.detach().forEach((el) => el.remove()));
    agentTracksRef.current = [];
    roomRef.current = null;
    setAgentState(null);
    setAgentSpeaking(false);
    setInterrupted(false);
  }, []);

  const start = useCallback(
    async (lang: "en" | "hi") => {
      if (roomRef.current) return;
      setStatus("connecting");
      setErrorKind(null);
      setErrorDetail("");
      setTimeline([]);
      setMicEnabled(true);

      let token;
      let lk: typeof import("livekit-client");
      try {
        [token, lk] = await Promise.all([tokenMutation.mutateAsync(lang), import("livekit-client")]);
      } catch (e) {
        setStatus("error");
        setErrorKind("connect");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }

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
        .on(RoomEvent.DataReceived, (payload: Uint8Array, _p?: Participant, _k?: unknown, topic?: string) => {
          if (topic !== "video" && topic !== "expert") return;
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (topic === "video" && data.url) {
              setTimeline((prev) => [...prev, { type: "video", id: uid("v"), url: data.url, title: data.title ?? "" }]);
            } else if (topic === "expert" && data.name) {
              setTimeline((prev) => [...prev, { type: "expert", id: uid("x"), ...data }]);
            }
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
        teardown();
        setStatus("error");
        setErrorKind("connect");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (e) {
        roomRef.current = null;
        await room.disconnect();
        teardown();
        setStatus("error");
        setErrorKind("mic");
        setErrorDetail(e instanceof Error ? e.message : String(e));
        return;
      }
      startedAtRef.current = performance.now();
      setStatus("live");
    },
    [tokenMutation, teardown, upsertSegments, userUuid],
  );

  /** End the call and hand back everything that was said, for the chat transcript. */
  const end = useCallback(async (): Promise<CallSummary> => {
    const room = roomRef.current;
    const durationSec = startedAtRef.current ? (performance.now() - startedAtRef.current) / 1000 : 0;
    startedAtRef.current = 0;
    roomRef.current = null;
    if (room) await room.disconnect();
    teardown();
    setStatus("idle");
    setErrorKind(null);
    const summary: CallSummary = { timeline: timelineRef.current, durationSec };
    setTimeline([]);
    return summary;
  }, [teardown]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
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
      await room.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);
    }
    const payload = new TextEncoder().encode(JSON.stringify({ type: "interrupt" }));
    room.localParticipant.publishData(payload, { reliable: true, topic: "control" }).catch(() => {});
  }, []);

  const addPhoto = useCallback((photo: string, caption: string) => {
    setTimeline((prev) => [...prev, { type: "photo", id: uid("p"), photo, caption }]);
  }, []);

  useEffect(
    () => () => {
      roomRef.current?.disconnect();
    },
    [],
  );

  const lastTurn = timeline.findLast((t): t is VoiceTurn => t.type === "turn");
  const lastUserTurn = timeline.findLast((t): t is VoiceTurn => t.type === "turn" && t.who === "user");
  const lastAgentTurn = timeline.findLast((t): t is VoiceTurn => t.type === "turn" && t.who === "agent");

  let phase: CallPhase = "listening";
  if (status === "connecting") phase = "connecting";
  else if (interrupted) phase = "listening";
  else if (agentState === "speaking" || (agentState === null && agentSpeaking)) phase = "speaking";
  else if (agentState === "thinking") phase = "thinking";
  else if (agentState === null && lastTurn?.who === "user" && turnText(lastTurn).interim === "" && turnText(lastTurn).final)
    phase = "thinking";

  return {
    status,
    phase,
    errorKind,
    errorDetail,
    micEnabled,
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

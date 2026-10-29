# 02 · Real-time voice call (LiveKit)

Figma: **02 Ask by speaking**, **02b Thinking**, **02c Speaking (live)**, **02d Couldn't hear**.

## Start / end

| Action | What happens |
|---|---|
| Mic button in the composer, or menu → *Talk by voice* | screen → `voice`, `POST /api/voice/token {user_uuid, lang}` and `import("livekit-client")` in parallel, `room.connect(url, token)`, mic on |
| Big yellow mic button | mute / unmute (muted = grey glass button with a slash, orb core dims) |
| Camera button | opens the camera; the call stays connected (see 04) |
| ✕ *End chat*, header back, or keyboard icon | disconnect → the whole call is appended to the chat as a transcript (see 03) |

The agent worker joins automatically and greets first — nothing to trigger.

## States → screens

`useVoiceCall` derives `phase` from the worker's `lk.agent.state` participant attribute
(LiveKit Agents 1.x), falling back to active-speaker events + transcript finality:

| phase | Figma | Top text | Orb |
|---|---|---|---|
| `connecting` | — | *Connecting you to the UltraTech Engineer…* | listening |
| `listening` | 02 | user's words: final = white, interim = 55 % white (or *I'm listening…*) | 220 px, bars animate while the user talks |
| `thinking` | 02b | the question, all white · hint *Thinking about your question…* | `orb-thinking.svg`, gentle pulse |
| `speaking` | 02c | *You asked* + question, live caption (spoken = white, in-flight = 35 %) · hint *Tap the orb if you want to interrupt* | shrinks to 72 % (158 px), bars animate |
| error | 02d | *Couldn't hear you* (mic blocked) / *Couldn't connect* (token or room failed) / *Couldn't hear that clearly* (dropped) + **Try again** / **Type instead** | muted core, bars 35 % |

## LiveKit events used

| Event | Use |
|---|---|
| `TranscriptionReceived` | user + agent segments; identity ≠ own uuid ⇒ agent. Segments are upserted by id into turns (consecutive same-speaker segments = one turn). |
| `ParticipantAttributesChanged` (`lk.agent.state`) | listening / thinking / speaking |
| `ActiveSpeakersChanged` | fallback speaking detection |
| `TrackSubscribed` (audio) | agent voice attached as a hidden `<audio>` |
| `DataReceived` topic `video` / `expert` | cards (see 05) |
| `Disconnected` | unexpected drop ⇒ error state |

## Tap-to-interrupt

The worker already supports voice barge-in (`min_interruption_words=1`). Tapping the orb while it
speaks: silences the current answer locally, opens the mic, and publishes
`{"type":"interrupt"}` on data topic **`control`**. **Backend TODO:** in `agent/worker.py`, on
that data message call `session.interrupt()` so the answer also stops server-side.

## Requirements

- Mic needs a secure context (`https://` or `localhost`).
- Earphones recommended for barge-in testing (see backend CLAUDE.md).
- Backend must run both `uvicorn main:app` and `python -m agent.worker dev`, with `LIVEKIT_*`,
  `SARVAM_API_KEY`, `OPENAI_API_KEY` and TTS keys in its `.env`.

Code: `src/lib/useVoiceCall.ts`, `src/components/screens/VoiceScreen.tsx`,
`src/components/voice/VoiceOrb.tsx`, `src/components/voice/VoiceControls.tsx`.

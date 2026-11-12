# 02 · Real-time voice call (LiveKit)

Users talk to the engineer in real time; the screen shows who is talking and what is being said.

Figma: **02 Ask by speaking**, **02b Thinking**, **02c Speaking (live)**, **02d Couldn't hear**.

## Start / end

| Action | What happens |
|---|---|
| Mic button in the composer, or menu → *Talk by voice* | screen → `voice`, `POST /api/voice/token {user_uuid, lang}` and `import("livekit-client")` in parallel, `room.connect(url, token)`, mic on |
| Big yellow mic button | mute / unmute (muted = grey glass button with a slash, orb core dims) |
| Camera button | opens the camera; the call stays connected (see [04 · Photo capture](04-photo-capture.md)) |
| ✕ *End chat* | disconnect → call transcript appended to the chat, then the PDF summary card + *Start a new chat* chip (see [03 · Text chat](03-text-chat.md)) |
| header back or keyboard icon | disconnect → call transcript appended to the chat, no PDF card (switch to typing) |

The agent worker joins automatically and greets first — nothing to trigger.

## States → screens

`useVoiceCall` derives `phase` from the worker's `lk.agent.state` participant attribute
(LiveKit Agents 1.x), falling back to active-speaker events + transcript finality:

| phase | Figma | Top text | Orb |
|---|---|---|---|
| `connecting` | — | *Connecting you to the UltraTech Engineer…* | listening |
| `listening` | 02 | user's words at 23/31: final = ink, interim = muted (or *I'm listening…*) · hint *Listening… speak naturally* (mic on) | gradient ring + faint outer rings + glow; bars animate while the user talks |
| `thinking` | 02b | the question, ink · hint *Thinking about your question…* | pale track + spinning yellow → orange arc, glow, three dots |
| `speaking` | 02c | *You asked* + question, live caption, ink (LiveKit only sends words as they are spoken) · hint *Tap the orb if you want to interrupt* | bars animate |
| error | 02d | *Couldn't hear you* (mic blocked) / *Couldn't connect* (token or room failed) / *Couldn't hear that clearly* (dropped) + **Try again** / **Type instead** | dashed ring, faded photo, red dot + grey dots, no glow |

## Layout

The text area and the orb block each get half of the free height (`flex-basis: 0`), so the orb, hint
and mic never move when the text grows. Long text scrolls inside its area and follows the newest line;
fades at the top and bottom show there is more. The answer text arrives at speaking speed, because the
worker syncs transcription to its audio.

The orb is one size in every state: 158 px, or smaller on short screens (`short:` 132 px, `tiny:` 99 px).

## LiveKit events used

| Event | Use |
|---|---|
| `TranscriptionReceived` | user + agent segments; identity ≠ own uuid ⇒ agent. Segments are upserted by id into turns (consecutive same-speaker segments = one turn). |
| `ParticipantAttributesChanged` (`lk.agent.state`) | listening / thinking / speaking |
| `ActiveSpeakersChanged` | fallback speaking detection |
| `TrackSubscribed` (audio) | agent voice attached as a hidden `<audio>` |
| `DataReceived` topic `video` / `expert` | cards (see [05 · Cards](05-expert-and-video-cards.md)) |
| `Disconnected` | unexpected drop ⇒ error state |

## Tap-to-interrupt

The worker already supports voice barge-in (`min_interruption_words=1`). Tapping the orb while it
speaks: silences the current answer locally, opens the mic, and publishes
`{"type":"interrupt"}` on data topic **`control`**. **Backend TODO:** in `agent/worker.py`, on
that data message call `session.interrupt()` so the answer also stops server-side.

## Requirements

- Mic needs a secure context (`https://` or `localhost`).
- Earphones recommended for barge-in testing (see backend [CLAUDE.md](https://github.com/hivoco/ultratech_voice_bot_backend/blob/main/CLAUDE.md)).
- Backend must run both `uvicorn main:app` and `python -m agent.worker dev`, with `LIVEKIT_*`,
  `SARVAM_API_KEY`, `OPENAI_API_KEY` and TTS keys in its `.env`.

Code: `src/lib/useVoiceCall.ts`, `src/components/screens/VoiceScreen.tsx`,
`src/components/voice/VoiceOrb.tsx`, `src/components/voice/VoiceControls.tsx`.

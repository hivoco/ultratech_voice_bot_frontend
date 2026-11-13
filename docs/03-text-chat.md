# 03 · Text chat + call transcript

Users type a question (or send a photo) and get the answer with its key points; a finished voice call lands here as a transcript.

Figma: **03b · Voice transcript — Direct answer** (also the layout for [04b](04-photo-capture.md) and [05b](05-expert-and-video-cards.md)).

## Typed questions

1. First question creates a backend session: `POST /api/session {user_uuid, stage}` → `session_id`
   (kept in memory; reset on error or *Start a new chat*). The stage makes the Expert
   stage-aware from turn 1; the composer only unlocks once a stage is picked.
2. `POST /api/turn {session_id, text, lang}` (`lang` = `en` | `hi` | `hinglish`) →
   `{text, key_points, serious}`. Not the stream on purpose: `/turn` returns the reply in the
   right script (Roman for Hinglish; the stream sends Devanagari deltas first) plus the key
   points, and `want_audio: false` skips TTS (the stream always synthesizes it). ~1–3 s.
3. The user bubble is added immediately; the engineer bubble shows typing dots until the answer
   arrives. The key points go in their own yellow card under the answer (v5 04b, "•" lines).
4. Errors (or an empty answer) show *"Sorry, I couldn't get an answer right now…"* with *Try
   again*; the raw detail goes to the console.

**Photos:** a pending photo goes with the next send to `POST /api/turn/image {session_id,
image_b64, caption, mime, lang}` → `{text, key_points, serious, condition}`. The caption is only
what the user typed. If `serious`, a site-engineer card follows (*A site engineer should check
this* · *Photo: cracks*). See [04](04-photo-capture.md).

The composer's mic button turns into a yellow **send** arrow while there is text or a pending
photo. Enter sends.

## Transcript of a voice call

When a call ends, its timeline becomes chat messages:

- divider chip: 🎤 *Voice chat duration · 1 min 48 sec*
- user turns → yellow bubbles
- agent turns → glass bubbles with meta *UltraTech Engineer · 0:42* (turn duration)
- photos, video cards and expert cards in the order they happened

A call ended with ✕ **End chat** also gets the PDF summary card after its transcript, plus a
**+ Start a new chat** chip above the composer. The composer stays usable, so the user can keep
typing; the chip hides once a new message is sent. Back / keyboard leave the call without the
card.

## Scrolling and "jump to latest"

New messages and streamed replies keep the chat pinned to the bottom **only while the reader is
there** (within 80 px). Scrolling up to re-read stops the auto-follow and shows a round **↓**
button (solid surface, yellow arrow, bottom-centre above the composer). Tapping it smooth-scrolls
to the newest message and hides it. Sending a message always jumps to the bottom. Only an upward
scroll hides the bottom state, so the app's own smooth scroll never flashes the button.

## Ending a chat

Once onboarding is done, an action row sits above the composer: 🌐 *{language}* (opens the
language question) · 🎤 *Talk by voice* · ✕ *End chat* (red outline). The header menu has the same
items. **End chat** (an active call is ended first) adds, in place:

- divider chip: 🎤 *Conversation ended · 2 min 40 sec* (time since the first question)
- engineer bubble: *"Thanks for chatting! Your conversation summary is ready — questions, answers
  and key points in one PDF."* (no PDF line when nothing was answered)
- **summary card**: glass card with the yellow **Get your conversation summary (PDF)** button
  (`SummaryCard` → `SummaryButton`, `src/lib/useConversationSummary.ts`); it prepares the
  summary as soon as it shows, then opens the PDF ([06](06-wrap-up.md) has the PDF details)

Then the composer locks (*This conversation has ended*, camera and mic disabled) and the action
row becomes **+ Start a new chat**, which resets the chat (new conversation id, new session) but
keeps the profile.

If the last engineer answer mentions a *photo*, the composer's camera button gets the pulsing
yellow **tap hint** ring (as in 03b).

## Bubble specs (from Figma)

| Element | Spec |
|---|---|
| Engineer bubble | 340 px max, glass, radius 22/22/22/6 (bottom-left), padding 12–16, text 15/22 at 94 % white |
| User bubble | `#FFD400`, radius 22/22/6/22 (bottom-right), text 16/22 medium `#1C1A14`, max 292 px |
| Meta row | 14 px wave icon + 12 px medium 70 % white |
| Duration chip | glass pill, 13 px mic icon, 12 px medium 85 % white |

Code: `src/lib/api.ts` (`streamTurn`), `src/lib/store.tsx` (`submitText`, `summaryToMessages`),
`src/components/chat/Bubbles.tsx`, `src/components/chat/Composer.tsx`.

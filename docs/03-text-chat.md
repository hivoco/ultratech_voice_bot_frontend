# 03 · Text chat + call transcript

Figma: **03b · Voice transcript — Direct answer** (also the layout for 04b / 05b).

## Typed questions

1. First question creates a backend session: `POST /api/session {user_uuid}` → `session_id`
   (kept in memory; reset on error or *End conversation*).
2. `POST /api/turn/stream {session_id, text}` returns NDJSON:
   `meta` → many `text {delta}` → `audio …` → `done {text}` (or `error {detail}`).
3. The user bubble is added immediately; an engineer bubble shows typing dots, then the
   streamed text with a yellow caret. The reply is marked complete at the first `audio` event
   (TTS of a text-only chat isn't needed) or at `done`.
4. Errors show *"Sorry, I couldn't get an answer right now…"*; the raw detail goes to the console.

The composer's mic button turns into a yellow **send** arrow while there is text or a pending
photo. Enter sends.

## Transcript of a voice call

When a call ends, its timeline becomes chat messages:

- divider chip: 🎤 *Voice chat duration · 1 min 48 sec*
- user turns → yellow bubbles
- agent turns → glass bubbles with meta *UltraTech Engineer · 0:42* (turn duration)
- photos, video cards and expert cards in the order they happened

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

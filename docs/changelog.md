# Changelog

Newest first. Started 2026-11-09; earlier history is in `git log`.

## 2026-11-13 — Stage question for every conversation

- **Changed** a stage pick to reach the backend: it's sent to the AI as a chat message (*My home is at
  the Foundation stage.*, in the chosen language; the terse *Stage of my home: Foundation* got a
  Hindi reply for English users in a live test) and the engineer's real answer is shown instead of the
  fixed *Foundation stage — got it.* The session history now carries the stage for every later
  answer. One paid AI answer per stage pick. Voice calls still don't get it (backend ask).

- **Perf:** picking a language or stage no longer re-renders every option bubble (logic moved into
  the reducer, callbacks stable; React Scan: language change 24 → 12 chip renders). Lighthouse
  unchanged: mobile 91 / 100 / 100 / 100, desktop 100 × 4 ([reviews](reviews.md#react-scan)).

- **Changed** returning users (stage saved) to get the same flow as the design: the standard
  greeting, the language card, then *Which stage is your home at right now?* with the saved stage
  ticked. Before, they got *Namaste! I'm with you at the {stage} stage.* and no stage question.
- The stage is asked at the start of every conversation only; a mid-chat language change doesn't
  ask it again. Switching language before choosing a stage re-asks it in the new language (it was
  dropped, leaving no usable stage chips).
- **Changed** the engineer's onboarding lines (language reply, stage question, stage reply, "ask me
  anything", change-language question) to follow the picked language: Devanagari for हिंदी, Roman
  Hindi for Hinglish ([01](01-onboarding.md#language-mapping)).

## 2026-11-13 — Camera disabled until the backend takes photos

- **Disabled** the composer camera button and the call's *Send photo* button (still shown, faded to
  40 %, *Photos coming soon*) and hid the "take a photo" tap hint, behind `PHOTOS_ENABLED = false`
  (`src/lib/features.ts`). Photos never left the
  browser, so answers to a photo were made without seeing it. The camera screen and all photo
  code stay; flip the switch once the backend accepts images ([04](04-photo-capture.md)).

## 2026-11-12 — Voice transcript + PDF fixes (found in live tests)

- **Fixed** duplicated turns in the call transcript and the summary PDF. LiveKit can send a late
  final for an earlier segment (e.g. the greeting) after the caller started talking; it was added
  as a new turn, so the PDF showed the greeting and the question twice, plus a stale interim
  ("आफ्टर द"). Segments are now updated in the turn they belong to, and a final replaces the
  interims before it (`applySegments` in `src/lib/useVoiceCall.ts`). Re-tested with a live call:
  one clean turn.
- **Fixed** markdown marks (`**`, `*`, `` ` ``) printed in the PDF transcript: the transcript sent to
  `/session/summary` now uses the same plain text as the chat bubbles (`src/lib/transcript.ts`).
- **Fixed** call bubble durations: a late update to an older turn (e.g. the greeting's final
  arriving after the caller started) no longer stretches it (*UltraTech Engineer · 0:12* for a
  9 s greeting).
- Re-checked after push (paid): voice call + 2-question text chat against the live backend, both
  PDFs correct; Lighthouse mobile 91 / 100 / 100 / 100 (median of 3), desktop 100 × 4; render scan
  unchanged.
- Live PDF API checked (paid): English voice + text chats, a 9-turn Hindi chat with HTML-like
  text (escaped, no injection) and a 22-turn chat (paginates over 4 pages, no overflow).

## 2026-11-12 — Voice orb captions (v5 "Orb · Listening / Thinking")

- **Added** the caption *Listening… speak naturally* under the orb while the mic is open
  (*Thinking about your question…* was already there).
- **Changed** the orb's soft yellow glow to show while thinking too, as in the design (it was
  listening / speaking only).
- Error states (*Couldn't hear you* · *Couldn't connect* · *Couldn't hear that clearly*, with
  *Try again* / *Type instead*) were already built; re-checked against the v5 frame.
- **Fixed** answers showing markdown marks: single `*emphasis*` / `_emphasis_`, `` `code` `` and
  `- ` list dashes now render as plain text (dashes become "•"); `**bold**` and `#` headings were
  already stripped (`plainText` in `src/lib/id.ts`).
- **Fixed** chat: after a successful *Try again*, the old error bubble kept its *Try again* button
  and a second tap sent the same question again. The button now shows only while the error is
  the newest message.
- Checked (backend mocked, no paid calls): voice screen in 10 states (connecting, listening, user
  talking, thinking, speaking, long answer, muted, 3 errors) on 393×852 and 375×667; chat flow
  (answer, error + retry, menu, End chat, PDF, Start a new chat).

## 2026-11-12 — Language asked in the chat (v5 "01 · Welcome")

- **Changed** the app to open on the chat. The greeting asks *Which language is easiest for you?*
  and a card below it holds the chips (*Tap one — you can change it anytime.*). The reply says
  *Great, I'll talk with you in {lang}.* and asks for the stage, as in the design.
- **Removed from view** the full-screen language picker. `LanguageScreen.tsx` is kept; its import
  and render are commented out in `VoiceBotApp.tsx` ([01](01-onboarding.md#old-language-screen-commented-out)).
- **Fixed** repeated taps on the 🌐 language chip (or menu → Change language) stacking one
  language question per tap: a new one is added only when the newest message isn't already one.
- Not built: the design's *More* language chip (backend speaks only English and Hindi).
- Checked: lint + types clean; mocked browser run (first visit and returning) with no errors.

## 2026-11-12 — Onboarding matches v5: no name step

- **Removed** the *What's your name?* step. The v5 welcome frame never asks for a name: the
  greeting (*Namaste! I'm your UltraTech Home-Building Expert…*) goes straight to the stage chips.
- **Changed** the returning-user greeting from *Welcome back, {name}!* to *Namaste! I'm with you at
  the {stage} stage.* A `name` saved by older versions is dropped from `localStorage` on load.
- **Changed** the composer and action row (language · Talk by voice · End chat) to show from the
  first bubble, as in the design; typing, mic and camera no longer wait for onboarding.
- The fallback print PDF labels the caller *You* (it used the name).
- Doc: [01-onboarding.md](01-onboarding.md).

## 2026-11-12 — v5 light design ("website design language")

- **Changed** the whole app from the dark glass look (v4) to the v5 light design from Figma:
  cream → yellow page, white cards with a warm border, dark text, white header pill, white
  composer and chips, red-outlined *End chat*. Camera stays dark, as designed.
- **Changed** the voice orb to the v5 one: the engineer's photo on a white disc inside a
  yellow → orange ring, with a state pill (wave bars, thinking dots, red dot when it couldn't hear).
- **Changed** the header and language screen to show the engineer avatar instead of the logo.
- **Changed** wrap-up: *Download PDF* and *End conversation* side by side.
- Icons on light surfaces recoloured from white to ink (`#1C1A14`).
- Design source: frames, sections and layer structure in `docs/design/v5/`, tokens in
  [design/v5/tokens.md](design/v5/tokens.md).
- Engineer avatar: `public/images/engineer-avatar.png` (512 px, transparent) made from the
  original design image (`docs/design/v5/engineer-original.png`, 1254 px). Header and language
  screen show it unclipped (helmet over the circle, as in Figma); the orb clips it to its photo circle.
- Checked: lint + build clean; Lighthouse mobile 92 / 100 / 100 / 100 (median of 3), desktop
  100 × 4; render scan unchanged ([reviews.md](reviews.md#react-scan)).
- Web Interface Guidelines pass: hover states on yellow buttons, reduced-motion stops decorative
  loops, balanced headings, input `name`, `translate="no"` on the brand title
  ([reviews.md](reviews.md)).

## 2026-11-11 — Camera switch without the mirrored flash

- **Fixed** tapping *Switch camera* flipped the old camera's picture sideways for a moment before
  the new camera opened (mirroring followed the requested camera, not the one on screen). The
  viewfinder now hides with *Switching camera…* until the new camera's first frame, and mirroring
  follows the camera actually showing. Switch is disabled mid-switch; torch resets.

See [04-photo-capture.md](04-photo-capture.md).

## 2026-11-11 — Menu closes on outside tap; jump-to-latest button

- **Fixed** the ⋯ header menu didn't close when tapping outside it. Its full-screen backdrop sat
  inside the glass header, whose `backdrop-filter` shrinks `position: fixed` children to the
  header, so it only covered the header strip. It now closes on any outside `pointerdown`.
- **Added** a **↓ jump to latest** button in the chat when scrolled up; the chat no longer yanks
  a reader who scrolled up back to the bottom on every streamed chunk.

See [03-text-chat.md](03-text-chat.md#scrolling-and-jump-to-latest).

## 2026-11-11 — End chat + PDF summary card in chat and calls

- **Added** an action row above the composer: language · *Talk by voice* · *End chat*. It replaces
  the *Language: … · Same for typing and speaking* hint.
- **Added** in-chat end state: *Conversation ended · {duration}* chip, a thank-you bubble, a
  **Get your conversation summary (PDF)** card, a locked composer and *+ Start a new chat*.
- **Added** the same PDF card after a call ended with ✕ *End chat* (composer stays usable).
- **Changed** the header menu's *End conversation* to *End chat* (in place, not the wrap-up screen).
- **Changed** the wrap-up button to the shared `SummaryButton` (one cached summary for both).
- **Fixed** (review) an older PDF card higher up the chat re-ran the paid summary after every new
  answer: each card now covers the turns it was created for (`turns` on the message).
- **Fixed** (review) *End chat* is disabled while a reply streams (it would need a second summary).
- **Removed** the unused `endConversation`; the print page loads only on click (`summaryPdf.ts`),
  the transcript builder lives in `transcript.ts`.
- **Perf** (React Scan) streamed replies re-rendered every bubble and chip on each chunk; now only
  the streaming bubble (memoized `MessageRow`). See [reviews.md](reviews.md#react-scan).
- **Fixed** the disabled composer mic wasn't dimmed (motion's inline opacity beat `disabled:`).
- **Lighthouse** re-run: mobile 92 / 100 / 100 / 100, desktop 100 ×4. See [lighthouse.md](lighthouse.md).

See [03-text-chat.md](03-text-chat.md#ending-a-chat), [02-voice-call.md](02-voice-call.md).

## 2026-11-11 — Download PDF summary on wrap-up

- **Added** a *Download PDF summary* button on the wrap-up screen (after chat or call). It calls
  the backend's new `POST /session/summary` through `/api/session/summary`, then opens the S3 PDF
  link, or prints a styled summary page (Save as PDF) when the backend has no S3 configured.
- **Added** a `conversationId` per conversation (new on every restart), used as the summary's room.
- **Changed** `guardPost` to take an optional body-size cap (the summary route allows 512 KB).
- **Fixed** ending a conversation from the menu during a live call dropped the call transcript.

See [06-wrap-up.md](06-wrap-up.md).

## 2026-11-09 — Language screen on every load

- **Added** a full-screen language picker (`LanguageScreen.tsx`) as the first thing shown on every
  page load, for new and returning users. The last-used language is highlighted, but a tap is
  always required.
- **Changed** onboarding from name → language → stage to language → name → stage.
- **Changed** the header menu: *Change language* stays hidden until a name is known.
- **Removed** the *More* option and its "Tamil, Telugu, Kannada and Malayalam are coming soon"
  message, from both the picker and the in-chat language options.

See [01-onboarding.md](01-onboarding.md).

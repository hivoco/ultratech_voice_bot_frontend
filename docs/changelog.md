# Changelog

Newest first. Started 2026-11-09; earlier history is in `git log`.

## 2026-11-13 — Onboarding feels alive: typing, pop-ins, waiting glow, UI sounds

- Scripted expert lines (the language card, the stage question, "got it") show typing dots first
  (1.1 s for the first card, 0.75 s after), then spring in. Only the first time: switching to voice
  and back doesn't replay them. The greeting itself still paints at once (LCP).
- Language / stage chips pop in one by one (`OptionChips`); while the expert waits for a pick the
  bubble gets a pulsing brand-yellow outline and a small wave runs across the chips every 5 s.
- UI sounds, synthesized with Web Audio (`src/lib/sfx.ts`, no audio files): pop when an expert
  message appears or an answer lands, tick on chip / option taps, swish on send. They start after the
  first tap (browser autoplay rules), stay silent in hidden tabs, and can be turned off from the
  menu ("Sound: on/off", saved in localStorage). Reduced motion: no pop-in delays, no wave.

## 2026-11-13 — Reply layouts, working expert card, crash-proofing (mobile)

- **4 reply kinds** (designer spec), from an optional `ui` on `/turn` / `/turn/image`
  (`src/lib/replyUi.ts`, `src/components/chat/ReplyBlocks.tsx`; backend contract in
  `docs/backend-fixes.md` item 13): plain answer + follow-ups (existing); **single choice**;
  **multi-step questions** (1 / 3 progress bar, one at a time, single or multi-select, Back, photo
  prompt row); **facts** (metrics box + titled checklists). Picks are sent as the next `/turn`
  with a readable `text` and structured `answers`; the card turns read-only. Facts go into the PDF.
- **Expert card**: buttons only for channels the backend sends (booking link, Call, WhatsApp,
  Email; all validated in `src/lib/contact.ts`); otherwise just a localized "pause work and get it
  inspected" note. The dead *Book a site visit* button is gone. Shown for any `serious` reply.
  Condition codes are shown as words.
- **Crash fixes:**
  - A malformed `ui` crashed the whole chat into the error page. `ui` is now validated in the
    browser (the route only size-caps it).
  - `key_points` as a non-list crashed suggestions. Now ignored.
  - Every message now has its own error boundary (`RowBoundary`), so one bad message shows "This
    message couldn't be shown" and the chat keeps working.
  - `serious` must be exactly `true`.
- **Mobile:** 44 px tap targets on Back / Next / photo row, `overflow-wrap:anywhere` for long
  words/URLs in cards, metric values wrap under their label, double taps send once.
- **Break-ui page** (dev only, 404 in production): `/dev/replies?data=demo|worst|empty|one`.
  Checked at 280 / 320 / 393 px: no horizontal overflow, no tap target under 40 px, no errors,
  unsafe links (`javascript:`, `http:`) dropped. Mocked chat flow passes at 320 and 393.

## 2026-11-13 — Fixes from long paid chats (en / hi / hinglish)

Two 10-turn paid chats per language (questions, suggestion taps, off-topic, memory, End chat → PDF).
- **Suggestion taps no longer make the bot repeat itself.** The backend's `key_points` are
  statements from the answer just given, so they now show under *Tap to know more* and a tap asks
  *"Tell me more about this: …"* (localized). Real `suggested_questions` from the backend (asked for
  in `docs/backend-fixes.md`) are used as-is under *At this stage, people often ask* once sent.
- **Language/stage chips after End chat** could still be tapped, changing the language and adding
  messages below *Conversation ended*. Now read-only.
- **Hinglish replies** that come back all-lowercase get each sentence capitalised; suggestion
  labels get a capital first letter in every language.
- Older suggestion lists lose the yellow highlight (only the tappable list has one); max 3 buttons.
- Checked: live taps in all 3 languages now get a real elaboration; mocked test of
  `suggested_questions` and the ended guards; lint, types, build.

## 2026-11-13 — Key points as tappable suggested questions

- The answer's `key_points` now show inside the engineer bubble under *At this stage, people
  often ask* (localized), as buttons with a chat icon and arrow; the first is highlighted yellow.
  A tap sends that text as the user's next message (`submitText`). Only the newest answer's list
  is tappable, and not while a reply is in flight or after End chat. Replaces the yellow "•" card.
- Checked: mocked test (tap → sent as the next `/api/turn` text, older list disabled), lint, types.

## 2026-11-13 — Backend integration: stage, language, key points, photos

Wired to the backend's new APIs (`FRONTEND_INTEGRATION.md`, backend commits 2bb0960…6c4da6e):

- **Stage on `/session`:** the Expert is stage-aware from the first answer. The stage pick is a
  local, instant *Foundation stage — got it.* again (no paid AI call per pick).
- **Typed chat on `/turn` with `lang`:** answers in the picked language's script (Roman Hinglish
  works now) with key points; no TTS is generated. Replaces `/api/turn/stream` (removed).
- **Key-points card:** yellow card under each answer, "•" lines (v5 04b).
- **Photos on:** chat photos → `/api/turn/image`; call photos → `/api/voice/photo`, relayed to
  the worker on `voice_photo` so the bot speaks the reply, with *Looking at your photo…* while
  it's checked. `serious` photos add a site-engineer card (chat) or arrive as the worker's
  `escalation` (call). *Try again* on a failed photo resends the photo.
- Checked: mocked suites; paid end-to-end on the live backend — Hindi chat → Hinglish switch →
  crack photo (card) → End chat → S3 PDF with 3 turns; English call → spoken question → crack
  photo (spoken reply, card) → End chat → S3 PDF. Lint, types, build clean; Lighthouse mobile
  90 / 100 / 100 / 100, desktop 100 × 4; React Scan unchanged (stage pick now cheaper).

## 2026-11-13 — Crash-proofing and small fixes

- **Changed:** the composer is locked until both onboarding questions are answered in the
  conversation: text box, mic and *Talk by voice* (chip and menu) disabled, text box faded to 50 %,
  placeholder *Pick a language first* → *Pick your home's stage first* → *Ask your question…*.

- **Changed:** nothing is pre-selected any more. Each conversation (page load or *Start a new
  chat*) starts with no language and no stage ticked; only the device id is kept. A ticked chip
  always means the user tapped it, so it was also sent (stage) or used (language). Before, the
  saved stage showed ticked but was never sent unless tapped again.

- **Added** error pages: `src/app/error.tsx` (in the app's style) and `src/app/global-error.tsx`
  (plain, for a root-layout failure). A render bug shows *Something went wrong* with *Try again* and
  *Reload page* instead of a blank screen.
- **Fixed** a crash path: a corrupted or outdated saved profile (e.g. `lang: "fr"`) reached the
  onboarding copy lookup. Saved `uuid` / `lang` / `stage` are now validated on load.
- **Hardened** the answer stream: a malformed line or an event without text is skipped instead of
  failing the whole answer (or printing "undefined").
- **Added** a voice hint for a stalled worker: after 20 s thinking about the same question, *Taking
  longer than usual… try asking again.* (seen live: no answer after 60 s+).
- **Fixed** screen-reader language: each bubble (and the voice screen's question / answer) is
  tagged `lang="hi"` only when it has Hindi script, instead of the whole chat following the
  current language.
- Checked: 6 corrupted-profile cases, a broken stream, a forced render crash, a 20 s stalled
  call, plus all earlier UI scripts; lint, types and build clean. Lighthouse mobile 90 / 100 / 100 /
  100 (−1 from the error pages' 9.5 KiB), desktop 100 × 4; React Scan unchanged.

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

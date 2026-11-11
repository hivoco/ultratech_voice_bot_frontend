# Changelog

Newest first. Started 2026-11-09; earlier history is in `git log`.

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

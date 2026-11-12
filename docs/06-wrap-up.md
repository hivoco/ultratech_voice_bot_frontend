# 06 · Wrap-up — Thank you

The closing screen that thanks the user and starts a fresh conversation.

Figma: **06 · Wrap-up — Thank you** (`116:1638`).

- Reached from the chat header **back** button (an active call is
  disconnected first).
- 24 px bold message: *"I hope your home-building questions have been answered. If anything else
  comes up, just ask. Thank you."* fades up.
- **Get your conversation summary (PDF)** (shared `SummaryButton`, secondary white/16 here, above
  *End conversation*) — shown once the
  conversation has at least one answered question (typed or spoken). Opening the screen calls
  `POST /api/session/summary` with the chat transcript (caller → engineer pairs from
  `buildTranscript`), so the backend summarizes the call in its language (Sarvam) and stores it.
  The button shows *Preparing your summary…* meanwhile, and *Couldn't prepare the PDF · Try again*
  on failure. The result is cached per conversation and transcript length (`useConversationSummary`), shared
  with the in-chat summary card, so going back and forth doesn't pay for a second summary.
  - Backend returns an S3 PDF link (`s3_link`, needs `S3_BUCKET` + AWS keys on the backend) → the
    button opens that PDF.
  - No link (S3 not configured, e.g. local dev) → the browser print dialog opens with a styled
    summary + full conversation; *Save as PDF* gives the file. The browser shapes Hindi correctly.
- Ending from the header menu during a live call now goes through `endVoice`, so the call
  transcript is added to the chat (and the PDF) before the wrap-up screen opens.
- **End conversation** (full-width yellow, 50 px, radius 18) resets the conversation and the
  backend text session but keeps the saved profile, so the user lands on *Namaste! I'm with you at the {stage} stage.* (or the stage question if none was picked).
- Header back returns to the conversation untouched.

Code: `src/components/screens/WrapUpScreen.tsx`, `src/lib/summaryPdf.ts` (print
fallback), `src/app/api/session/summary/route.ts`, `src/lib/transcript.ts`, `src/lib/useConversationSummary.ts`, `src/lib/store.tsx` (`restart`,
`conversationId`).

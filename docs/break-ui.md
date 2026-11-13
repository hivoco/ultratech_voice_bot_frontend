# Break-UI stress test (2026-10-29)

The frontend fed with worst-case realistic data, following the
[break-ui skill](https://github.com/emilkowalski/skills/blob/main/skills/break-ui/SKILL.md).
All 10 findings are fixed (see [Fixes applied](#fixes-applied)); the tables below are the original report.
The dev-only data switches (`?data=…` for chat, `?call=…` for call mode) were removed once everything was fixed.

## What the worst-case values are based on

| Field | Limit | Source |
|---|---|---|
| Name | 40 chars, spaces collapsed | `store.tsx` `submitText` |
| Typed question | 500 (composer), 1,000 (API) | `Composer.tsx` `maxLength`, `guard.ts` |
| Spoken question | unbounded (~40 s of speech) | Sarvam transcript |
| Answer | 260 tokens voice, ~35 words text | backend `agent/brain.py`, `core/adapters/llm_luna.py` |
| Video title | 100 chars (longest real title) | backend knowledge base |
| Expert name / role / slot | 80 / 200 / 200 | `useVoiceCall.ts` `parseCard` |
| Messages per session | unbounded, not paginated | `store.tsx` |

## What broke

| # | Severity | Field | Worst-case value | What happens | Fix |
|---|---|---|---|---|---|
| 1 | Broken | Spoken question (voice screen) | 40 s Hinglish transcript | Heading has no limit. Pushes the mic and End buttons off-screen on 360×740 and 320×568. Orb covers the mic row on 390×844 and 430×852 | Bottom-anchored max height + fade, like the answer text (`VoiceScreen.tsx:109`, section `:82`) |
| 2 | Broken | User message at 200% zoom | Pasted YouTube link | `max-w-[292px]` is wider than the column, so the bubble runs off the left edge | `max-w-[min(292px,85%)]` (`Bubbles.tsx:96`) |
| 3 | Broken | Photo caption | `IMG_20251014_183022_HDR_portrait_edited_edited.HEIC` | Caption is 445 px wide in a 248 px bubble at every width. At 200% zoom the whole photo bubble leaves the screen | `break-words` on caption (`Bubbles.tsx:93`); image `w-full` instead of `w-[248px]` (`:85`) |
| 4 | Broken | Empty answer | Backend `done` with `""` | Bubble shows only "UltraTech Engineer", no answer, no Try again | Treat empty final text as an error (`store.tsx:265`) |
| 5 | Ugly | Voice screen on 320×568 | Long answer while speaking | Orb overlaps the answer, and the "Tap the orb" hint sits on the button labels | Orb size from height, e.g. `size-[min(220px,28dvh)]` (`VoiceOrb.tsx:32`) |
| 6 | Ugly | Video title | 100-char real title | `line-clamp-2` never applies (`block` overrides it), so it shows 4 lines | Remove `block` (`Bubbles.tsx:132`) |
| 7 | Ugly | Expert name / role | 80-char name, long role | Cut off with "…", no way to read the rest | Name wraps to 2 lines; role keeps truncate + `title` (`Bubbles.tsx:149-150`) |
| 8 | Ugly | Header title | "UltraTech Engineer" (fixed copy) | Shows "UltraTech Engi…" at 320 px and at 200% zoom | 15–16 px title under 360 px (`Header.tsx:46`) |
| 9 | Fragile | Answer text | `**bold**`, numbered lists | Markdown shows as raw `**`. Only the backend prompt prevents it | Strip `**` / `#` before rendering, or in the backend |
| 10 | Fragile | Call length | 75-minute call | "75 min 12 sec", never rolls up to hours | `1 hr 15 min` in `longDuration` (`id.ts:16`) |

## Decisions for you

- **Long spoken question:** show the newest 3–4 lines with a fade at the top (recommended,
  matches the answer area), or shrink the font.
- **Video title:** 2 lines as designed (recommended; the card opens the video anyway) or full title.
- **Header at 320 px:** smaller title font (recommended) or accept the "…".
- **Empty answer:** show the error with Try again (recommended) or hide the bubble.

## What held up

- 40-character Telugu name, one-letter name "J", "?" and emoji-only messages.
- 490-character Hinglish question and long Devanagari answers wrap cleanly; paragraphs keep their breaks.
- Pasted links wrap inside the bubble at 320 px and up.
- Stage and language chips wrap; the expert call slot wraps; buttons fit at 320 px.
- Empty video title falls back to "Watch the related video"; empty expert role leaves no gap.
- 200×4000 gallery photo crops cleanly (`object-cover`).
- "You asked" in the speaking phase clamps to 2 lines; the answer stays anchored to its newest line.
- 1,000 messages: 515 ms to render in dev, scrolling at 16.7 ms per frame (p50), 22.6 ms (p95).

Not checked: RTL (no RTL language offered) and light mode (the app is dark only).

## Fixes applied

Decisions taken: the recommended option for each of the four above.

| # | Fix |
|---|---|
| 1 | Spoken question keeps its newest 4 lines (3 on short phones) with a fade at the top |
| 2 | User bubble `max-w-[min(292px,85%)]` |
| 3 | Photo bubble `w-[260px] max-w-[85%]`, image `w-full`, caption `break-words` |
| 4 | Empty answer throws in the `ask` mutation, so it shows the error bubble with Try again |
| 5 | `short:` variant (`globals.css`, max-height 640px): orb at 60%, answer 3 lines, "You asked" 1 line, tighter gaps |
| 6 | Removed `block` so `line-clamp-2` applies |
| 7 | Expert name wraps to 2 lines; role keeps `truncate` and gets `title`; empty role renders nothing |
| 8 | Header title 15 px under 360 px; logo hidden under 300 px |
| 9 | `plainText()` (`id.ts`) drops `**`, `__` and `#` headings in answer bubbles and the voice answer |
| 10 | `longDuration` rolls up to "1 hr 15 min" |

Re-checked every dataset (Demo included) at 430, 320 and 215 px (200% zoom): no element leaves the
column. Voice screen on 430×852, 390×844, 360×740, 360×640 and 320×568: the controls stay on
screen and the text, orb, hint and controls don't overlap. Lighthouse after the fixes: mobile 97 / 100 / 100 / 100,
desktop 100 / 100 / 100 / 100.

Still at 200% zoom on a 430 px phone (215 CSS px): the header title shows "…" and the duration
chip wraps to two lines. Both stay readable; left as is.

## Call mode (2026-10-30)

The same test on the voice call screen, with worst-case call states.

The call demos (`?call=…`) used for this test were removed once everything was fixed.

States: connecting · listening, nothing said · user talking (40 s Hindi/English transcript) · unbroken words
(a website, a product name and an 18-digit number as single words) · thinking · speaking with a long
answer · one-word turns · empty transcripts · muted · interrupted · the three errors · a 75-minute call
with 60 turns, a video, a photo and an expert card (end it to check the chat transcript).

First checked on 430×932, 390×844, 360×740, 360×640, 320×568 and 215×466 (a 430 px phone at 200% zoom);
the final fix was swept across all heights (below).

### What broke, and the fix

| # | Severity | What happened | Fix |
|---|---|---|---|
| 1 | Broken | Unbroken words (a website, a long number) ran off the right edge of the screen at every size | `wrap-anywhere` on the status text |
| 2 | Broken | At 200% zoom the control row was wider than the screen; "End chat" was cut off | Smaller buttons and padding under 300 px wide |
| 3 | Broken | At 200% zoom the orb covered the text and the controls in every state; on the error screens Try again sat under the mic | Long text scrolls (see below); smaller orb on short screens; Try again / Type instead wrap |
| 4 | Ugly | 360×740 while speaking: "Tap the orb if you want to interrupt" was hidden behind the controls | Same |
| 5 | Ugly | 320×568 listening, muted and interrupted: the 4-line heading touched the orb | Tighter top and bottom padding on short screens |
| 6 | Ugly | 200% zoom: headings at 32 px fit two words per line | 24 px headings and 19 px answer text under 300 px wide |
| 7 | Broken | iPhone SE (375×667), error screen: Try again / Type instead were cut off behind the call controls. Fixed size steps (640 px, 500 px) missed this height | Same as 3 |

**Long text scrolls; nothing else shrinks.** The text area takes the room the orb, hint and controls
leave, and long text scrolls inside it. During a live transcript (your question, the engineer's answer) it
stays on the newest line; scroll up to read the start and it stays put, scroll back to the bottom and it
follows again. A fade at the top shows there's more above. The orb size depends only on the screen height
(220 px, 80% up to 760 px tall, 60% up to 640 px, 45% up to 500 px; variants `mid`, `short`, `tiny` in
`globals.css`), never on how much text there is, so the orb, hint and mic button don't move or shrink between
states. On the smallest screens the error screen drops the orb (it's only a status picture there). Phones held
sideways (≤420 px tall, variant `flat`) drop it in every state so the text has room; the speaking hint then
says "Start talking to interrupt" (voice barge-in) instead of "Tap the orb".
Code: `TextArea` in `VoiceScreen.tsx`.

Checked by sweeping every state across heights 460–932 px at 430, 375, 320 and 215 px wide, plus 844×390 and
740×360 sideways: no overlaps, the
hint and buttons never clipped, the orb and mic button in the same place in every state.

### What held up

- One-word turns, empty transcripts (no text shows, no blank bubble afterwards).
- Ending the 75-minute call: "Voice chat duration · 1 hr 15 min", answer lengths 0:45 and 2:11, the
  video, photo and expert cards, and a sentence cut off mid-way all reach the chat in ~130 ms. No `**`.

### Left as is

Adding a `@custom-variant` to `globals.css` needs a dev server restart; Turbopack keeps serving the old CSS.

## 2026-11-13 — Reply layouts and expert card (mobile)

Page: `/dev/replies?data=demo|worst|empty|one` (dev only; 404 in production). Fixtures in
`src/app/dev/replies/fixtures.ts` are raw backend-shaped replies, so they go through the same
parsers as the chat. Worst case: Devanagari quiz with 5 questions × 6 long options, unbreakable
words and a 110-char URL, 40-char metric labels/values, 3 long suggestions, an 80-char helpdesk
name, a long email, and a malformed reply (`key_points` as a string, `serious: "yes"`,
`javascript:` phone, `http:` booking link, quiz with one option).

| # | Severity | Field | What happened | Fix |
|---|---|---|---|---|
| 1 | Broken | `ui` (malformed) | Whole chat replaced by the error page | Validate `ui` in the browser; per-message `RowBoundary` |
| 2 | Broken | `key_points` not a list | Crash in suggestions | `stringList()` on untrusted lists |
| 3 | Ugly | metric label + long value | Label crushed, split mid-word ("Composit/e") | Row wraps; value drops under the label |
| 4 | Ugly | `condition` | `structural_diagonal_crack_near_opening` shown raw | `_`/`-` → spaces |
| 5 | Ugly | Back / Next / photo row | Under 44 px tall | `min-h-11` |
| 6 | Fragile | long words / URLs in cards | Could push past the bubble at 280 px | `overflow-wrap:anywhere` |
| 7 | Fragile | contact links | Unsafe schemes would become links | Only `tel:`, `mailto:`, `wa.me`, `https:` |
| 8 | Fragile | double tap on last quiz option | Could send twice | `advancing` guard + answers sent once per card |

Verified at 280, 320 and 393 px: no horizontal scroll, no tap target under 40 px, no console
errors. Known, not fixed: at 320 px the composer's chip row wraps to two lines (readable, costs
~36 px of height).

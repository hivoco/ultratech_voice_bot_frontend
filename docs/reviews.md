# Code reviews (2026-10-29)

What each review found, what was fixed, and what is left. Reviews used the agent skills in
`.agents/skills/`: `security-review`, `vercel-react-best-practices` +
`vercel-composition-patterns`, `web-design-guidelines`, `writing-guidelines`, plus React Scan.

## Security (`security-review`)

No critical or high findings. Fixed:

| Finding | Fix |
|---|---|
| Public `/api/voice/token` mints LiveKit tokens with the backend's credentials (cost abuse) | `guardPost`: same-origin check + per-IP limit (6/min), `user_uuid` format check |
| No type/size checks on chat routes (token burn, 500s on bad JSON) | 16 KB body cap, JSON-object check, `text` ≤ 1000 chars, `session_id` / `user_uuid` regex |
| Data-channel cards trusted as-is | only from `participant.isAgent`; video URL must be `https:`; expert fields copied one by one (`parseCard`) |
| No security headers; page uses mic + camera (clickjacking) | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader: false` |
| Basic-auth credentials over plain http | startup warning when production `BACKEND_URL` is non-https and not loopback |

Left for deployment / backend (not changed here):

- Add a platform rate limit (e.g. Vercel WAF rule on `/api/voice/token`) — the in-memory limiter
  is per server instance.
- Backend: short LiveKit token TTL + max call length, session-store eviction, no hard-coded
  default `DEMO_PASS`, keep the FastAPI port private so the proxy can't be bypassed.
- Optional: Turnstile/captcha before a call starts.

Second pass (2026-11-06), fixed:

| Finding | Fix |
|---|---|
| Public `/api/health` relayed internal backend fields such as `missing_keys` | passes on `ok` only, 5 s timeout |
| Rate limit keyed on the first `x-forwarded-for` entry, which the client controls | keyed on the last entry, added by our proxy |
| `Origin` check skipped when the header was missing | `Origin` required on POST (stops casual scripts only, not a real auth check) |
| Chunked bodies were read in full before the size check | body read is capped at 16 KB as it streams |
| Backend 5xx bodies and content type relayed to the browser, no timeout | 5xx logged and replaced with a generic 502; JSON content type forced; 15 s timeout |
| No HSTS; CSP covered framing only | HSTS added; CSP adds `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` |

Still open: `/api/voice/token` has no real authentication, so a script that forges `Origin` and
rotates IPs can still start paid calls. The WAF rule and Turnstile below address this. A full
`script-src` CSP is not set: nonces need request-time rendering, which conflicts with the static
first paint in [lighthouse.md](lighthouse.md).

## Accessibility & UX (`web-design-guidelines`)

Fixed: visible `:focus-visible` ring app-wide (composer pill gets the ring), 44 px hit areas on
small icon buttons, header menu keyboard support (Escape, arrows, focus in/out), chat as
`role="log"` with `aria-busy` while streaming and `lang="hi"` for Hindi, voice screen announces
phase changes only (not the live transcript) and errors via `role="alert"`, orb is a labelled
status image when not tappable, mic button label matches its action, failed replies get a
**Try again** button, typing dots announce "typing…", video links say "opens in a new tab",
gallery picker no longer forces the camera, image load errors are shown, focus moves to each new
screen, reduced-motion stops infinite loops, `interactiveWidget: resizes-content` keeps the
composer above the Android keyboard.

Deviation from Figma: the 12 px "UltraTech Engineer · 0:42" meta text is white **85 %**
(Figma 70 %) — at 70 % it sits on the brightest corner of the glass and falls below 4.5:1.

Not done: confirmation before *End conversation* (it is the screen's explicit CTA), URL/back-
button history for screens, landscape side safe-areas.

## React / Next.js (`vercel-react-best-practices`, `vercel-composition-patterns`)

Fixed: chat screen kept mounted with `<Activity>` (typed draft, scroll and bubbles survive the
camera round-trip), deprecated `next/image` `priority` replaced with `loading="eager"`, voice and
camera chunks + `livekit-client` prefetched on hover/focus, text-chat session created on
composer focus (saves a round trip), header takes a `trailing` slot (`KeyboardButton` /
`HeaderMenu`) instead of a mode prop, single-pass message scans with hoisted regex, voice
timeline ref updated synchronously (no lost final segment on hang-up), Basic-auth header built
once.

Not done (optional): `LazyMotion` to trim ~20 KB, splitting the app context into
state/actions/voice, server-side hiding of the first-visit greeting for returning users.

## React Scan

Ran `react-scan/lite` headlessly over onboarding, typing, sending, menu, voice, camera and back
to chat (and `npm run scan` opens the visual overlay). React 19.3 canary has no profiling hooks
(`profiling-hooks-status: no-inject-method`), so lite listed every fiber in each commit as
"parent re-render". Verified with render counters: **5 keystrokes → 10 `Composer` renders (dev
double-render), 0 `ChatScreen` / `AppProvider` renders** — typing does not re-render the chat.
During a streamed reply each chunk re-renders the app context consumers (header, composer, chat);
cost is small today, see the optional context split above.

**Re-run 2026-11-11** (End chat + PDF work): headless Chrome with a DevTools commit hook (the
signal React Scan uses), over onboarding → type → streamed reply → End chat → PDF ready → Start a
new chat. Per streamed reply (~30 chunks):

| Component | Before | After |
|---|---|---|
| `EngineerBubble` | 120 (every bubble, every chunk) | 1 per chunk (the streaming one) |
| `Chip` (stage / language) | 180 | 0 |
| `UserBubble` | 60 | 1 |
| `ActionChip` (new action row) | 90 | 2 per chunk |

Fixes: messages render through a memoized `MessageRow` that only gets the props its kind needs;
`restart` / `changeLanguage` / `endChat` are stable callbacks; chip icons are module constants.
The remaining 2 chip renders per chunk are *Talk by voice* / *End chat*, whose handlers follow the
voice-call object. Typing: 1 `Composer` render per keystroke, 0 chat renders. End chat → summary
ready: one render each. No console errors.

**Re-run 2026-11-12** (language asked in chat, voice transcript fixes), same hook on the dev server:
typing 28 keys → `Composer` ×28 only; send + reply → `MessageRow` 3, `EngineerBubble` 2,
`UserBubble` 1; End chat → summary ready → one render each; menu → `HeaderMenu` 2; voice open
(token error) → `VoiceOrb` 3. Same as the 11-12 baseline; only console error is the mocked 503.

**Re-run 2026-11-13** (language-based onboarding lines, stage question every chat). New phases for
the onboarding taps found every option row re-rendering on a language or stage pick: `chooseLang` /
`chooseStage` depended on state, so each pick gave the memoized rows new callbacks. The logic moved
into the reducer and both callbacks are now stable:

| Phase | `Chip` | `MessageRow` |
|---|---|---|
| pick language | 9 → 9 | 4 → 3 |
| switch language before stage | 15 → 15 | 6 → 4 |
| pick stage | 15 → 12 | 7 → 3 |
| change language via chip | 24 → 12 | 12 → 6 |

What's left is the new bubbles plus the option rows whose tick actually changes. Typing, streamed
reply, End chat, menu and voice phases unchanged.

Re-run later on 2026-11-13 (nothing pre-selected, composer locked until language + stage, error
pages): every phase the same as above; only console error is the mocked 503.

**Re-run 2026-11-12** (v5 light design), same commit-hook scan on the dev server, with the
streamed reply, summary and voice token mocked (no paid calls):

| Phase | Renders |
|---|---|
| Typing 28 keystrokes | `Composer` 28 (one per key), chat 0 |
| Send + streamed reply | `MessageRow` 3, `EngineerBubble` 2, `UserBubble` 1, `ActionChip` 4 |
| End chat → summary ready | `MessageRow` 3, `SummaryCard` 1, `SummaryButton` 2 |
| Menu open + close | `AnimatePresence` only |
| Voice open (error) → *Type instead* | `VoiceScreen` 4, `VoiceOrb` 3, `VoiceControls` 4 |

Same profile as before the redesign; only class names and the orb changed. The mocked reply arrives
in one piece, so per-chunk counts weren't re-measured (render structure is unchanged). Console:
only the mocked 503 from the voice token.

## Web Interface Guidelines — 2026-11-12 (v5 light design)

Vercel `web-design-guidelines` (rules fetched fresh) over `src/components/**`, `layout.tsx`,
`globals.css`.

Fixed:
- Yellow buttons had no hover state (send / mic, PDF, Try again, End conversation, voice mic,
  round voice buttons) → `hover:bg-brand-hover` (`#F5C800`) / `hover:bg-sand`.
- Decorative loops (orb rings, mic ripple, camera tap-hint) kept pulsing opacity under
  `prefers-reduced-motion` (`MotionConfig` only stops transforms) → stopped with `useReducedMotion`.
- Headings without `text-wrap` → `text-balance` (language title, voice headline), `text-pretty`
  (live transcript, wrap-up).
- Composer input had no `name` → `name="message"`.
- "UltraTech Engineer" title could be auto-translated → `translate="no"`.

Checked, fine: contrast (muted 6.4:1, danger 5.0:1, grey voice headline 3.7:1 at 32 px bold),
icon buttons labelled, `…` everywhere, `theme-color` matches the page, safe-area insets,
`touch-action: manipulation`, images sized.

Left as is (needs a decision):
- **No confirm or undo on *End chat* / *End conversation*** — the guideline wants one for
  destructive actions; the Figma flow has none.
- **Sentence case** on buttons ("Book a site visit") — the guideline prefers Title Case; kept to
  match the design.
- `focus:outline-none` on the two screen wrappers (`VoiceBotApp.tsx`) — they're `tabIndex=-1`
  focus targets moved to programmatically, not controls.

## Docs (`writing-guidelines`)

Added a one-line summary to every page, linked all cross-references, unified backend setup in
`setup-and-deploy.md` (with the `.env` key list), spelled out NDJSON / LCP / TBT / CLS, and added
"Common tasks" + "Known backend gaps" to `AGENTS.md`.

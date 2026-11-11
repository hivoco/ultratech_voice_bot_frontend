# AGENTS.md — index

Start here. Each doc below covers **one** topic or use case; read only the ones you need.

## Use cases (one file each)

| # | Use case | Doc | Main code |
|---|---|---|---|
| 1 | Onboarding: language (every load) → name → home stage | [docs/01-onboarding.md](docs/01-onboarding.md) | `src/lib/store.tsx`, `src/components/screens/LanguageScreen.tsx`, `src/components/screens/ChatScreen.tsx`, `src/components/ui/Chip.tsx` |
| 2 | Real-time voice call (LiveKit) | [docs/02-voice-call.md](docs/02-voice-call.md) | `src/lib/useVoiceCall.ts`, `src/components/screens/VoiceScreen.tsx` |
| 3 | Text chat + call transcript + End chat / PDF card | [docs/03-text-chat.md](docs/03-text-chat.md) | `src/lib/api.ts`, `src/components/chat/*`, `src/lib/useConversationSummary.ts` |
| 4 | Photo capture | [docs/04-photo-capture.md](docs/04-photo-capture.md) | `src/components/screens/CameraScreen.tsx` |
| 5 | Expert hand-off + video cards | [docs/05-expert-and-video-cards.md](docs/05-expert-and-video-cards.md) | `src/components/chat/Bubbles.tsx` |
| 6 | Wrap-up / end conversation + PDF summary | [docs/06-wrap-up.md](docs/06-wrap-up.md) | `src/components/screens/WrapUpScreen.tsx`, `src/lib/summaryPdf.ts` |

## Reference

| Topic | Doc |
|---|---|
| Architecture, folders, state, design tokens, Figma map | [docs/architecture.md](docs/architecture.md) |
| Backend API + proxy routes + env vars | [docs/backend-api.md](docs/backend-api.md) |
| Setup, running locally, deploying | [docs/setup-and-deploy.md](docs/setup-and-deploy.md) |
| Lighthouse scores and performance rules | [docs/lighthouse.md](docs/lighthouse.md) |
| Security, accessibility, React and React Scan reviews | [docs/reviews.md](docs/reviews.md) |
| Worst-case stress test, chat and call mode (findings and fixes) | [docs/break-ui.md](docs/break-ui.md) |
| What changed and when | [docs/changelog.md](docs/changelog.md) |

## Common tasks → doc

| Task | Read |
|---|---|
| Add or change a backend call | [docs/backend-api.md](docs/backend-api.md) |
| Add a screen or component | [docs/architecture.md](docs/architecture.md) |
| Touch anything on first paint | rules in [docs/lighthouse.md](docs/lighthouse.md) |
| Run locally / which backend keys | [docs/setup-and-deploy.md](docs/setup-and-deploy.md) |

## Known backend gaps (UI ready, backend TODO)

- Name + stage not sent to the backend — [01](docs/01-onboarding.md#backend-gap)
- Language not sent for typed chat, voice only — [01](docs/01-onboarding.md#backend-gap)
- Tap-to-interrupt `control` topic — [02](docs/02-voice-call.md#tap-to-interrupt)
- No photo / vision endpoint — [04](docs/04-photo-capture.md#backend-gap)
- `expert` data topic + site-visit booking — [05](docs/05-expert-and-video-cards.md)

## Rules for changes

- UI must match the Figma file (ULTRA-TECH PLAYER, node `116:1636`). Assets live in `public/`
  exactly as exported — don't redraw or recolour them.
- The browser never calls the backend directly; add a route under `src/app/api/` instead, and
  run its body through `guardPost` (`src/lib/guard.ts`).
- Data from the LiveKit data channel is untrusted: validate it like `parseCard` in `useVoiceCall.ts`.
- Keep `livekit-client` a dynamic import and non-first screens `next/dynamic` (Lighthouse).
- Run `npm run lint && npm run build` before committing.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UltraTech Engineer — Voicebot Frontend

Mobile-first web app for the **UltraTech "Home-Building Expert" voicebot**. Individual home
builders talk (or type) to the *UltraTech Engineer* in English, हिंदी or Hinglish and get calm,
confident answers grounded on the *Baat Ghar Ki* knowledge base. Built from the Figma file
**ULTRA-TECH PLAYER → Section 2 · v4 voice English**.

## Links

| What | Link | Status |
|---|---|---|
| Frontend repo | this repository (`ultratech_voice_bot_frontend`) | local git repo, remote not created yet |
| Backend repo | https://github.com/hivoco/ultratech_voice_bot_backend | private (hivoco org) |
| API (backend) | local: `http://127.0.0.1:8090` | **no public deployment yet** |
| Frontend URL | local: `http://localhost:3000` | **no public deployment yet** |
| Figma | [ULTRA-TECH PLAYER · Final](https://www.figma.com/design/lu3flioWfjECGOFHBl7lQq/ULTRA-TECH-PLAYER?node-id=116-1636) | source of truth for the UI |

> Fill in the public API and frontend URLs here once they are deployed (see
> [docs/setup-and-deploy.md](docs/setup-and-deploy.md)).

## What the app does

| Use case | Figma frames | Doc |
|---|---|---|
| Onboarding — name, language, home stage | 01 Welcome | [docs/01-onboarding.md](docs/01-onboarding.md) |
| Real-time voice call (LiveKit) — listening, thinking, speaking, couldn't hear | 02, 02b, 02c, 02d | [docs/02-voice-call.md](docs/02-voice-call.md) |
| Typed questions with streamed answers + call transcript | 03b | [docs/03-text-chat.md](docs/03-text-chat.md) |
| Photo of a site problem (camera / gallery) | 04a, 04b | [docs/04-photo-capture.md](docs/04-photo-capture.md) |
| Expert hand-off card + Baat Ghar Ki video cards | 05b | [docs/05-expert-and-video-cards.md](docs/05-expert-and-video-cards.md) |
| Wrap-up — thank you / end conversation | 06 | [docs/06-wrap-up.md](docs/06-wrap-up.md) |

## Stack

Next.js 16 (App Router, React 19, React Compiler) · TypeScript · Tailwind CSS v4 ·
`motion` (animations) · `livekit-client` (WebRTC voice, lazy-loaded) ·
`@tanstack/react-query` (token / health / chat requests).

The browser only calls this app's own `/api/*` routes; those proxy to the FastAPI backend and
add its Basic-auth credentials server-side, so no secret reaches the client bundle.

## Quick start

```bash
npm install
cp .env.example .env.local      # set BACKEND_BASIC_PASS (BACKEND_URL defaults to :8090)
npm run dev                     # http://localhost:3000
```

Backend setup (separate repo, API server + voice worker + its own `.env` of provider keys):
see [docs/setup-and-deploy.md](docs/setup-and-deploy.md). Without the keys the UI still loads,
but calls and answers fail gracefully.

| Script | Does |
|---|---|
| `npm run dev` | dev server |
| `npm run build && npm start` | production build / server |
| `npm run lint` | ESLint (incl. React Compiler rules) |
| `npm run scan` | React Scan overlay on the running dev server (re-render highlighting) |

## Quality

Lighthouse 12 on the production build (reports in [docs/lighthouse/](docs/lighthouse/)):

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | 96 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

Details and fixes: [docs/lighthouse.md](docs/lighthouse.md). Security, accessibility, React and
React Scan review results: [docs/reviews.md](docs/reviews.md).

## Project status

- ✅ All Figma screens built and wired to the real backend contract (`/voice/token`,
  `/session`, `/turn/stream`, `/health`, LiveKit transcription + data topics).
- ⚠️ Voice and answers need the backend `.env` keys (not in the repo) — verified locally that
  every proxy route reaches the backend; generation fails only on missing provider keys.
- ⚠️ Backend gaps the UI is ready for: [name/stage personalisation](docs/01-onboarding.md#backend-gap),
  [tap-to-interrupt](docs/02-voice-call.md#tap-to-interrupt), [photo understanding](docs/04-photo-capture.md#backend-gap),
  [expert hand-off](docs/05-expert-and-video-cards.md#expert-card--topic-expert-proposed-contract-backend-todo).

Agent/contributor index: [AGENTS.md](AGENTS.md).

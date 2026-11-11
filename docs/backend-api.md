# Backend API + proxy routes

Backend: https://github.com/hivoco/ultratech_voice_bot_backend (FastAPI, `main.py`).
Its own integration guide: [FRONTEND.md](https://github.com/hivoco/ultratech_voice_bot_backend/blob/main/FRONTEND.md).

## Proxy routes (this app)

The browser calls only these. They run on the server, add `Authorization: Basic …` to every request and forward
to `BACKEND_URL`. If the backend is down they return `502 {"detail":"Backend unreachable"}`
or `502 {"detail":"Backend error"}` if it answers with a 5xx, whose body is logged on the server and
not relayed (`/api/health` always answers `200 {"ok":true|false}`). JSON calls time out after 15 s.

Every POST goes through `guardPost` (`src/lib/guard.ts`): same-origin check, `Origin` required (403), 16 KB body
cap (413), JSON-object check (400) and a per-IP limit per minute (429) — token 6, session 10,
turn 30. Inputs are validated: `user_uuid` `^[A-Za-z0-9-]{8,64}$`, `session_id` 32 hex chars,
`text` 1–1000 characters.

| This app | Backend | Body → response |
|---|---|---|
| `POST /api/voice/token` | `POST /voice/token` | `{user_uuid, lang:"en"\|"hi"}` → `{url, token, room}` |
| `POST /api/session` | `POST /session` | `{user_uuid}` → `{session_id}` |
| `POST /api/turn/stream` | `POST /turn/stream` | `{session_id, text}` → NDJSON stream |
| `POST /api/session/summary` | `POST /session/summary` | `{room, lang, transcript:[{caller, bot}]}` → `{summary, lang, turns, pdf_url}` (`pdf_url` = backend `s3_link` if https, else null). Limit 5/min, 512 KB body, ≤120 turns × 4000 chars, 60 s timeout |
| `GET /api/health` | `GET /health` | → `{ok}` (other backend fields are dropped) |

## Realtime contract (LiveKit, direct browser ⇄ LiveKit Cloud)

| Channel | Direction | Payload |
|---|---|---|
| audio track | both | mic up, agent voice down |
| transcription | agent → app | user + agent segments (`final` flag) |
| attribute `lk.agent.state` | agent → app | `listening` / `thinking` / `speaking` |
| data topic `video` | agent → app | `{url, title}` ✅ implemented in backend |
| data topic `expert` | agent → app | `{name, role, callSlot?, phone?}` ⏳ proposed |
| data topic `control` | app → agent | `{type:"interrupt"}` ⏳ backend should call `session.interrupt()` |

## Environment variables (`.env.local`, server-only)

| Var | Default | Meaning |
|---|---|---|
| `BACKEND_URL` | `http://127.0.0.1:8090` | FastAPI base URL |
| `BACKEND_BASIC_USER` | — | backend `DEMO_USER` |
| `BACKEND_BASIC_PASS` | — | backend `DEMO_PASS` |
| `SITE_URL` | Vercel production domain, else `http://localhost:3000` | public URL for the canonical link, social cards, `robots.txt` and `sitemap.xml`. Must be set at build time; `next.config.ts` fixes it into the build, because link-preview bots get a fresh server render, and warns if it isn't public |

## Verified locally (2026-10-29)

With the backend running without its `.env`:

- `/api/health` → 200 (at the time the proxy also relayed `kb_entries: 100` and `missing_keys: [OPENAI, GEMINI, GROQ, FISH]`; call the backend's `/health` directly to see these now)
- `/api/session` → 200 with a `session_id`
- `/api/turn/stream` → streams, then `{"type":"error"}` (router/LLM key missing) — the UI shows
  the friendly error bubble
- `/api/voice/token` → 500 *LiveKit not configured* — the UI shows *Couldn't connect* + Try again

Everything works once the backend `.env` has the provider and LiveKit keys.

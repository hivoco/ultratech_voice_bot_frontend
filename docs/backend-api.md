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
| `POST /api/voice/token` | `POST /voice/token` | `{user_uuid, lang:"en"\|"hi", stage?, ui_lang?}` → `{url, token, room}` (the worker reads `stage` from the token metadata) |
| `POST /api/session` | `POST /session` | `{user_uuid, stage?}` → `{session_id}` (stage = one of the 6 picker values) |
| `POST /api/turn` | `POST /turn` | `{session_id, text, lang?, answers?}` → `{text, key_points, suggested_questions, serious, ui, contact}` (`key_points` is retired by the backend, always `[]`) (`want_audio:false`; only these fields are relayed). 30/min, 45 s timeout |
| `POST /api/turn/image` | `POST /turn/image` | `{session_id, image_b64, caption?, mime?, lang?}` → `{text, key_points, suggested_questions, serious, condition}`. 10/min, 4 MB body, 60 s timeout |
| `POST /api/voice/photo` | `POST /voice/photo` (login) | `{image_b64, caption?, stage?, lang:"en"\|"hi", room?}` → `{reply, serious, condition, query}`. 6/min, 4 MB body |
| `POST /api/session/summary` | `POST /session/summary` | `{room, lang, ui_lang?, transcript:[{caller, bot}]}` → `{summary, lang:"en"\|"hi"\|"hinglish", turns, pdf_url}` (`ui_lang:"hinglish"` → Roman summary/PDF) (`pdf_url` = backend `s3_link` if https, else null). Limit 5/min, 512 KB body, ≤120 turns × 4000 chars, 60 s timeout |
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
- `/api/turn` → error (router/LLM key missing) — the UI shows the friendly error bubble
- `/api/voice/token` → 500 *LiveKit not configured* — the UI shows *Couldn't connect* + Try again

Everything works once the backend `.env` has the provider and LiveKit keys.

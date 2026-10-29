# Setup, running locally, deploying

## Local

```bash
# frontend
npm install
cp .env.example .env.local        # set BACKEND_BASIC_PASS
npm run dev                       # http://localhost:3000

# backend (separate repo, needs its own .env with provider + LiveKit keys)
python3 -m venv .venv && .venv/bin/pip install fastapi "uvicorn[standard]" python-dotenv \
  pydantic python-multipart livekit-api httpx requests
.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8090
# voice worker — additionally needs livekit-agents + sarvam/silero plugins:
python -m agent.worker dev
```

Microphone and camera need `https://` or `localhost`. To test on a phone over the LAN, use an
HTTPS tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`).

## Deploy (not done yet)

1. **Backend**: deploy the FastAPI app *and* the LiveKit agent worker somewhere long-running
   (a VM / container — the worker is a persistent process). Note its public HTTPS URL.
2. **Frontend** (e.g. Vercel): set `BACKEND_URL`, `BACKEND_BASIC_USER`, `BACKEND_BASIC_PASS`
   as server env vars, then `vercel deploy --prod`.
3. Put both URLs in the **Links** table of `README.md`.

The frontend is a standard Next.js 16 app; any Node host that runs `npm run build && npm start`
works.

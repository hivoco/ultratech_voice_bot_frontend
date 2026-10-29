# 04 · Photo capture

Users photograph a site problem; the photo joins the chat or the live call.

Figma: **04a · Camera — Crack photo**, **04b · Voice transcript — Photo diagnosis**.

## Camera screen

- Opened from the composer camera button or the voice screen's *Send photo* button.
- `getUserMedia({ video: { facingMode: "environment" } })` fills the rounded viewfinder
  (`#332B24`, radius 28) with the yellow focus reticle centred on top.
- Top bar: ✕ close · title pill *Take a photo of the crack* · ⚡ flash (torch, only enabled when
  the track reports `torch` capability).
- Tips chips *Close to the crack* / *In good light* + hint line.
- Bottom: last-photo thumbnail (yellow border; opens the gallery picker) · shutter
  (`shutter.svg`, white flash on capture) · switch camera (front/back).
- No camera or permission denied ⇒ *Choose a photo* gallery fallback
  (`<input type=file accept=image/* capture=environment>`).

Photos are downscaled to max 1280 px JPEG (q 0.85) data URLs in the browser.

## Where the photo goes

| Opened from | Result |
|---|---|
| Chat composer | attached as a pending photo above the composer; sent with the next message as a yellow photo bubble (*1 photo* tag), like 04b |
| Live voice call | added to the call timeline; appears in the transcript when the call ends |

## Backend gap

The backend has **no image / vision endpoint** today, so the photo is shown in the conversation
but only the user's text goes to `/turn/stream`. To diagnose photos, add e.g.
`POST /turn/photo` (multipart `session_id`, `text`, `file`) backed by a vision model, then send
the data URL from `submitText` in `src/lib/store.tsx`. For voice calls, the photo could be sent
over LiveKit (`room.localParticipant.sendFile` / byte stream) to the worker.

Code: `src/components/screens/CameraScreen.tsx`, `src/lib/store.tsx` (`capturePhoto`).

# 04 · Photo capture

Users photograph a site problem; the photo joins the chat or the live call.

> **On since 2026-11-13** (backend `/turn/image` and `/voice/photo`). `PHOTOS_ENABLED` in
> `src/lib/features.ts` switches photos off again (buttons faded and disabled) if needed.

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
- **Switching camera:** the tap stops the old camera, hides the viewfinder and shows *Switching
  camera…* (switch button disabled, torch reset). The new feed fades in once its first frame is
  ready. The front camera is mirrored like a selfie view, but the mirroring follows the camera
  actually on screen (`shownFacing`, from the track's `facingMode`), never the one just tapped
  for. Before this, the old camera's picture flipped sideways for a moment before the new one
  opened. Photos are saved unmirrored.
- No camera or permission denied ⇒ *Choose a photo* gallery fallback
  (`<input type=file accept=image/* capture=environment>`).

Photos are downscaled to max 1280 px JPEG (q 0.85) data URLs in the browser.

## Where the photo goes

| Opened from | Result |
|---|---|
| Chat composer | attached as a pending photo above the composer; sent with the next message as a yellow photo bubble (*1 photo* tag), like 04b |
| Live voice call | added to the call timeline; appears in the transcript when the call ends |

## Where the photo goes

**Chat:** `POST /api/turn/image {session_id, image_b64, caption, mime, lang}` (4 MB body cap, 10/min,
60 s timeout) → `{text, key_points, serious, condition}`. The answer and key points show like a
typed answer; `serious` adds the site-engineer card. *Try again* on a failed photo resends it.

**Voice call:** the photo joins the call timeline, then `POST /api/voice/photo {image_b64, lang,
stage, room}` (backend login required, 6/min) → `{reply, serious, condition, query}`. The browser
relays that to the worker on the LiveKit data topic **`voice_photo`**, and the bot speaks the
reply in the call. While it's being checked the voice screen shows *Looking at your photo…*. If
`serious`, the worker sends an **`escalation`** message and the site-engineer card is added to the
call transcript. Failures only log; the call goes on.

Tested live 2026-11-13 with a wall-crack photo: chat (serious → card) and a call (reply spoken
~25 s after the photo, card in the transcript).

Code: `src/components/screens/CameraScreen.tsx`, `src/lib/store.tsx` (`capturePhoto`).

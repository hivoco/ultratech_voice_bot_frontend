# 05 · Expert hand-off card + Baat Ghar Ki video cards

Figma: **05b · Voice transcript — Expert consult**.

Both arrive as LiveKit **data messages** during a call and are rendered as cards in the
transcript. They are never spoken.

## Video card — topic `video` (live in the backend)

```json
{ "url": "https://youtube.com/watch?v=…", "title": "…" }
```

Rendered as a glass card (yellow play tile, *Baat Ghar Ki · Video*, title) opening the URL in a
new tab (`rel="noopener noreferrer"`). The Figma has no video-card frame, so it reuses the
engineer-bubble styling.

## Expert card — topic `expert` (proposed contract, backend TODO)

```json
{ "name": "Er. Rakesh Verma", "role": "UltraTech site engineer · In your area",
  "callSlot": "Will call you by 11 AM tomorrow", "phone": "+91…" }
```

Card per Figma: yellow avatar with hard-hat icon, name + role, green shield, dark call-slot row
with phone icon, **Book a site visit** (yellow, calendar icon) and a phone button (`tel:` link,
only if `phone` is present).

**Backend TODO:** when the worker escalates a structural/safety question, publish this payload on
topic `expert`. *Book a site visit* has no endpoint yet — wire it to the lead/CRM API when it
exists (client wants name + number capture, see backend `docs/client_feedback.md` #12).

Code: `src/components/chat/Bubbles.tsx` (`VideoCard`, `ExpertCard`),
`src/lib/useVoiceCall.ts` (`DataReceived` handler).

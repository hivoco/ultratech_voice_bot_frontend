/**
 * Feature switches. The code behind a switched-off feature stays in place; its buttons stay visible
 * but faded and disabled.
 */

/**
 * Photo capture (composer camera button, "Send photo" in calls, the tap hint when the engineer asks
 * for a photo). When off, both buttons show at 40% opacity and can't be tapped ("Photos coming
 * soon"), and the tap hint is hidden.
 *
 * Off until the backend can receive images: today a photo never leaves the browser (`/turn/stream`
 * takes text only and the voice worker has no photo topic), so the engineer would answer without
 * seeing it. Turn on once the backend has an image input. See docs/04-photo-capture.md.
 */
export const PHOTOS_ENABLED = false;

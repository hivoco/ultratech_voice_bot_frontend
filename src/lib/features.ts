/**
 * Feature switches. The code behind a switched-off feature stays in place; its buttons stay visible
 * but faded and disabled.
 */

/**
 * Photo capture (composer camera button, "Send photo" in calls, the tap hint when the engineer asks
 * for a photo). When off, both buttons show at 40% opacity and can't be tapped ("Photos coming
 * soon"), and the tap hint is hidden.
 *
 * On since 2026-11-13: chat photos go to `/turn/image`, call photos to `/voice/photo` and are
 * relayed to the worker on the "voice_photo" topic. Set to false to switch photos off again
 * (e.g. if the backend's image input is down). See docs/04-photo-capture.md.
 */
export const PHOTOS_ENABLED = true;

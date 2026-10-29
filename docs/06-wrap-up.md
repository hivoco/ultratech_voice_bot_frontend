# 06 · Wrap-up — Thank you

Figma: **06 · Wrap-up — Thank you** (`116:1638`).

- Reached from the chat header **back** button or menu → **End conversation** (an active call is
  disconnected first).
- 24 px bold message: *"I hope your home-building questions have been answered. If anything else
  comes up, just ask. Thank you."* fades up.
- **End conversation** (full-width yellow, 50 px, radius 18) resets the conversation and the
  backend text session but keeps the saved profile, so the user lands on *Welcome back, {name}!*.
- Header back returns to the conversation untouched.

Code: `src/components/screens/WrapUpScreen.tsx`, `src/lib/store.tsx` (`endConversation`,
`restart`).

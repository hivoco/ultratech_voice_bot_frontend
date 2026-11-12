# 01 · Onboarding — language, home stage

The chat opens first and asks for the language in a bubble; the language reply then asks for the home's construction stage. There is no name step (removed 2026-11-12 to match v5).

Figma: **01 · Welcome — Name & language** (v5 section `193:7231`, `docs/design/v5/frames/text-01-welcome.png`). Despite the frame title, the design never asks for a name.

## Flow

1. Engineer bubble (🔊 *UltraTech Engineer* meta row): *"Namaste! I'm your UltraTech
   Home-Building Expert. Building a home is a big decision, and I'm with you at every step."* +
   **Which language is easiest for you?**
2. Option card: **Tap one — you can change it anytime.** with `English · हिंदी · Hinglish`.
3. User bubble with the language → *"Great, I'll talk with you in {lang}."* + **Which stage is your
   home at right now?** with chips `Plot · Plan · Foundation · Structure · Plaster · Finishing`.
4. Stage chosen → engineer invites the first question.

This runs on every page load and on *Start a new chat*. The composer (typing, mic, camera) works
from the first bubble; picking a language or stage is optional (no language = Hindi voice, the
backend default). The action row above it is always shown, as in the design: 🌐 *{lang}* (once a
language is known) · 🎤 *Talk by voice* · ✕ *End chat* ([03](03-text-chat.md#ending-a-chat)).

Selected chips turn yellow with a check icon (`/icons/check.svg`). Only the newest option bubble
of each kind is interactive.

Not built: the design's **More** chip (more languages). The backend speaks only `en` and `hi`.

### Old language screen (commented out)

Before v5 a full-screen picker (`LanguageScreen.tsx`, *Choose your language / अपनी भाषा चुनें*)
opened every page load. The file is kept; its import and render are commented out in
`src/components/VoiceBotApp.tsx`. To bring it back, uncomment both and set the initial
`screen` in `src/lib/store.tsx` to `"language"`. `pickLanguage` in the store still serves it.

## Persistence

`localStorage["ultratech.profile.v1"] = { uuid, lang, stage }`. A `name` saved by older
versions is dropped on load.

- `uuid` is created once per device (`crypto.randomUUID`) and is the LiveKit participant
  identity and the text-chat `user_uuid`.
- Returning users (stage saved) get *"Namaste! I'm with you at the {stage} stage."* + the same
  language question; the last-used language shows as selected. After a tap the reply says *Ask
  me anything — tap the mic or type below.* instead of asking the stage again.
- Header menu → **Change language** (or the 🌐 chip) pushes a new language bubble with the same
  three options. The reply asks for the stage if it isn't known yet. Tapping it again while that
  question is still the newest message adds nothing (no stack of repeated questions).

## Language mapping

| Chip | Sent to backend (`lang`) | Why |
|---|---|---|
| English | `en` | English prompt + greeting |
| हिंदी | `hi` | Hindi prompt (natural Hinglish output, Devanagari for TTS) |
| Hinglish | `hi` | same voice prompt — it already speaks code-mixed Hinglish |

The language only changes what the bot says. The app's own text (bubbles, buttons, hints) is
English in every language.

## Backend gap

The backend does not accept `stage` yet (`/voice/token` takes `user_uuid` + `lang`,
`/session` takes only `user_uuid`). They stay client-side. To personalise answers, add them to the
token metadata / session and read them in `agent/worker.py` and `core/pipeline.py`
(`session.stage` already exists in the HTTP path).

**The language reaches voice calls only.** Typed chat sends no language: `/session` has no `lang`
field and `/api/turn/stream` sends only `session_id` + `text`. (The old composer hint *Same
for typing and speaking* was removed with the action row on 2026-11-11.)

Code: `src/lib/store.tsx` (`openingMessages`, `submitText`, `chooseLang`, `chooseStage`),
`src/components/screens/ChatScreen.tsx`, `src/components/ui/Chip.tsx`.

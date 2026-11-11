# 01 · Onboarding — language, name, home stage

Every page load starts by asking for the language. First-time users then give their name and their home's construction stage before asking anything.

Figma: **01 · Welcome — Name & language** (`116:1814`). The full-screen language picker has no Figma frame; it reuses the app's colours and logo.

## Flow

1. **Language screen** (`LanguageScreen.tsx`), on **every page load**, for new and returning users:
   *Choose your language / अपनी भाषा चुनें* with `English · हिंदी · Hinglish`. A tap is always
   required. The last-used language is highlighted but never skipped or auto-selected. The chat
   stays hidden until a language is picked.
2. Engineer bubble: *"Hi! I'm the UltraTech Engineer — with you at every step of building your
   home."* + **What's your name?** The composer placeholder becomes *Type your name…* and the
   mic/camera are disabled until a name is given.
3. User bubble with the name → *"Great, I'll talk with you in …"* + **Welcome, {name}! Which
   stage is your home at right now?** with chips `Plot · Plan · Foundation · Structure · Plaster ·
   Finishing`.
4. Stage chosen → engineer invites the first question. The action row above the composer
   appears: 🌐 *{lang}* (change language) · 🎤 *Talk by voice* · ✕ *End chat*
   ([03](03-text-chat.md#ending-a-chat)).

Selected chips turn yellow with a check icon (`/icons/check.svg`). Only the newest option bubble
of each kind is interactive.

Only a page load shows the language screen. *Start again* from the wrap-up screen goes straight
back to the chat. The current screen is deliberately not saved, which is what makes it appear on
every load.

## Persistence

`localStorage["ultratech.profile.v1"] = { uuid, name, lang, stage }`.

- `uuid` is created once per device (`crypto.randomUUID`) and is the LiveKit participant
  identity and the text-chat `user_uuid`.
- Returning users pick a language, then skip the rest of onboarding and get *"Welcome back,
  {name}! I'm with you at the {stage} stage."*
- Header menu → **Change language** pushes a new language bubble with the same three options. It
  is hidden until a name is known, because the reply greets the user by name.

## Language mapping

| Chip | Sent to backend (`lang`) | Why |
|---|---|---|
| English | `en` | English prompt + greeting |
| हिंदी | `hi` | Hindi prompt (natural Hinglish output, Devanagari for TTS) |
| Hinglish | `hi` | same voice prompt — it already speaks code-mixed Hinglish |

The language only changes what the bot says. The app's own text (bubbles, buttons, hints) is
English in every language.

## Backend gap

The backend does not accept `name` or `stage` yet (`/voice/token` takes `user_uuid` + `lang`,
`/session` takes only `user_uuid`). They stay client-side. To personalise answers, add them to the
token metadata / session and read them in `agent/worker.py` and `core/pipeline.py`
(`session.stage` already exists in the HTTP path).

**The language reaches voice calls only.** Typed chat sends no language: `/session` has no `lang`
field and `/api/turn/stream` sends only `session_id` + `text`. (The old composer hint *Same
for typing and speaking* was removed with the action row on 2026-11-11.)

Code: `src/components/screens/LanguageScreen.tsx`, `src/lib/store.tsx` (`pickLanguage`,
`openingMessages`, `submitText`, `chooseLang`, `chooseStage`),
`src/components/screens/ChatScreen.tsx`, `src/components/ui/Chip.tsx`.

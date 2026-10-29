# 01 · Onboarding — name, language, home stage

First-time users give their name, pick a language and their home's construction stage before asking anything.

Figma: **01 · Welcome — Name & language** (`116:1814`).

## Flow

1. Engineer bubble: *"Hi! I'm the UltraTech Engineer — with you at every step of building your
   home."* + **What's your name?** The composer placeholder becomes *Type your name…* and the
   mic/camera are disabled until a name is given.
2. User bubble with the name → engineer asks **Which language would you like to talk in?** with
   chips: `English · हिंदी · Hinglish · More`.
   - *More* replies that Tamil/Telugu/Kannada/Malayalam are coming soon and re-offers the chips.
3. User bubble with the language → *"Great, I'll talk with you in …"* + **Welcome, {name}! Which
   stage is your home at right now?** with chips `Plot · Plan · Foundation · Structure · Plaster ·
   Finishing`.
4. Stage chosen → engineer invites the first question. The hint above the composer shows
   *Language: {lang} · Same for typing and speaking*.

Selected chips turn yellow with a check icon (`/icons/check.svg`). Only the newest option bubble
of each kind is interactive.

## Persistence

`localStorage["ultratech.profile.v1"] = { uuid, name, lang, stage }`.

- `uuid` is created once per device (`crypto.randomUUID`) and is the LiveKit participant
  identity and the text-chat `user_uuid`.
- Returning users skip onboarding and get *"Welcome back, {name}! I'm with you at the {stage}
  stage."*
- Header menu → **Change language** pushes a new language bubble.

## Language mapping

| Chip | Sent to backend (`lang`) | Why |
|---|---|---|
| English | `en` | English prompt + greeting |
| हिंदी | `hi` | Hindi prompt (natural Hinglish output, Devanagari for TTS) |
| Hinglish | `hi` | same voice prompt — it already speaks code-mixed Hinglish |

## Backend gap

The backend does not accept `name` or `stage` yet (`/voice/token` and `/session` only take
`user_uuid` + `lang`). They stay client-side. To personalise answers, add them to the token
metadata / session and read them in `agent/worker.py` and `core/pipeline.py`
(`session.stage` already exists in the HTTP path).

Code: `src/lib/store.tsx` (`openingMessages`, `submitText`, `chooseLang`, `chooseStage`),
`src/components/screens/ChatScreen.tsx`, `src/components/ui/Chip.tsx`.

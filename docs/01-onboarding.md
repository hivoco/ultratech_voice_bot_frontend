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
4. Stage chosen → the chip is ticked and the engineer replies *Foundation stage — got it.* (local,
   no AI call). The stage is sent when the session is created, with the first question.

This runs on every page load and on *Start a new chat*. **The composer is locked until both are
picked:** the text box, mic and *Talk by voice* (chip and menu) are disabled and the text box is faded
to 50 %, with the placeholder *Pick a language first*, then *Pick your home's stage first*. (Before
2026-11-13 picking was optional.) The action row above it is always shown, as in the design: 🌐
*{lang}* (once a language is picked) · 🎤 *Talk by voice* (disabled until onboarding is done) · ✕
*End chat* ([03](03-text-chat.md#ending-a-chat)).

Selected chips turn yellow with a check icon (`/icons/check.svg`). Only the newest option bubble
of each kind is interactive.

Not built: the design's **More** chip (more languages). The backend speaks only `en` and `hi`.

### Old language screen (commented out)

Before v5 a full-screen picker (`LanguageScreen.tsx`, *Choose your language / अपनी भाषा चुनें*)
opened every page load. The file is kept; its import and render are commented out in
`src/components/VoiceBotApp.tsx`. To bring it back, uncomment both and set the initial
`screen` in `src/lib/store.tsx` to `"language"`. `pickLanguage` in the store still serves it.

## Persistence

`localStorage["ultratech.profile.v1"] = { uuid }`. Only the device id is restored; a `lang`,
`stage` or `name` saved by older versions is ignored.

**Nothing is pre-selected.** Every conversation (page load or *Start a new chat*) starts with no
language and no stage ticked. A choice counts, and is used or sent, only once the user taps it in
that conversation. Before any language tap, a voice call uses the backend default (`hi`) and the
PDF summary uses `hi` too.

- `uuid` is created once per device (`crypto.randomUUID`) and is the LiveKit participant
  identity and the text-chat `user_uuid`.
- Returning users see exactly the same flow as new ones, as in the design. Stage chips stay
  tappable until the chat moves past them.
- The stage is asked at the start of every conversation (again after *Start a new chat*), never
  mid-chat: a language pick asks it until a stage is chosen or the chat has a real answer. So
  switching language in the first card before choosing a stage re-asks it in the new language.
- Header menu → **Change language** (or the 🌐 chip) pushes a new language bubble with the same
  three options. Its reply says *Ask me anything — tap the mic or type below.* (no second stage
  question). Tapping it again while that question is still the newest message adds nothing (no
  stack of repeated questions).

## Language mapping

| Chip | Sent to backend (`lang`) | Why |
|---|---|---|
| English | `en` | English prompt + greeting |
| हिंदी | `hi` | Hindi prompt (natural Hinglish output, Devanagari for TTS) |
| Hinglish | `hi` | same voice prompt — it already speaks code-mixed Hinglish |

The engineer's onboarding lines follow the picked language (`ONBOARDING` in `src/lib/store.tsx`):

| | English | हिंदी | Hinglish |
|---|---|---|---|
| Language reply | Great, I'll talk with you in English. | बढ़िया, अब मैं आपसे हिंदी में बात करूँगा। | Badhiya, ab main aapse Hinglish mein baat karunga. |
| Stage question | Which stage is your home at right now? | आपका घर अभी किस stage पर है? | Aapka ghar abhi kis stage par hai? |
| Stage reply | Foundation stage — got it. | ठीक है, Foundation stage. | Theek hai, Foundation stage. |
| Key points (screen-reader label) | Key points | मुख्य बातें | Mukhya baatein |
| Photo escalation card | A site engineer should check this | इसे site engineer से check करवाएँ | Ise site engineer se check karwayein |
| Ask anything | Ask me anything: tap the mic to talk, or type your question below. | कुछ भी पूछिए: बोलने के लिए mic दबाएँ, या नीचे लिखें। | Kuch bhi poochiye: bolne ke liye mic dabaiye, ya neeche type kariye. |
| Change language | Which language would you like to talk in? | आप किस भाषा में बात करना चाहेंगे? | Aap kis language mein baat karna chahenge? |

Hindi keeps construction words in Roman ("stage", "mic"), like the bot's answers. The greeting and
the first language card stay English (no language picked yet), and so do the stage chips and the
app's own buttons and hints (End chat, Talk by voice, placeholders).

## Backend gap

**Text chat (since 2026-11-13):** the stage goes on `/session {stage}` and the language on every
`/turn {lang}` (`en` | `hi` | `hinglish`, Roman script for Hinglish). The stage pick itself is a
free, instant local reply (*Foundation stage — got it.*); no AI call.

**Voice calls don't get the stage:** a call is a separate LiveKit session and `/voice/token` takes
only `user_uuid` + `lang`. To fix, accept `stage` on `/voice/token`, put it in the participant
metadata and read it in `agent/worker.py`. (Call photos do send the stage, on `/voice/photo`.)

Code: `src/lib/store.tsx` (`openingMessages`, `submitText`, `chooseLang`, `chooseStage`),
`src/components/screens/ChatScreen.tsx`, `src/components/ui/Chip.tsx`.

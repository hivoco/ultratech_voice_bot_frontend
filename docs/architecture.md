# Architecture

Where code lives, how state flows, and how Figma maps to components. Read before adding a screen or component.

## Folder map

```text
src/
  app/
    layout.tsx            fonts (Inter + Noto Sans Devanagari), metadata, viewport
    page.tsx              renders <VoiceBotApp/>
    globals.css           Tailwind v4 theme tokens + `glass` utility
    icon.png, apple-icon.png
    api/                  server-only proxy to the FastAPI backend (see docs/backend-api.md)
  components/
    VoiceBotApp.tsx       QueryClient + MotionConfig + AppProvider, screen switcher
    screens/              ChatScreen · VoiceScreen · CameraScreen · WrapUpScreen
    chat/                 Bubbles (engineer/user/duration/video/expert), Composer
    voice/                VoiceOrb, VoiceControls
    ui/                   Header, Chip, Icon
  lib/
    store.tsx             AppProvider: reducer state, onboarding, text chat, call → transcript
    useVoiceCall.ts       LiveKit room hook (states, transcript timeline, mute, interrupt)
    api.ts                browser fetch helpers (+ NDJSON stream reader)
    backend.ts            server-only backend fetch with Basic auth
    types.ts, id.ts
public/
  icons/ orb/ camera/ images/   assets exported from Figma
```

## State

One client app at `/` — screens are state, not routes (`screen: chat | voice | camera | wrapup`),
so a live call survives opening the camera. `AppProvider` (`useReducer`) holds:

- `profile` (persisted to localStorage), `messages` (the conversation), `pendingPhoto`,
  `screen` + `cameraReturn`.
- `voice` = `useVoiceCall(profile.uuid)`.
- React Query: `useQuery(["health"])` drives the header *Online* dot; `useMutation` for the voice
  token and for streamed text turns.

## Design tokens (Figma → Tailwind)

| Token | Value | Use |
|---|---|---|
| `brand` | `#FFD400` | user bubbles, selected chips, mic, CTAs |
| `ink` | `#1C1A14` | text/icons on yellow |
| `surface` | `#2A2218` | app background (+ "legibility" gradient overlay) |
| `surface-deep` | `#0E0D0B` | camera background |
| `viewfinder` | `#332B24` | camera viewfinder / photo placeholder |
| `glass` utility | radial white 40 %→0 from top-left, 2 px gradient stroke at 40 %, 21 px backdrop blur | header, engineer bubbles, composer, orb, round buttons |
| Type | SF Pro on Apple (system), Inter fallback, Noto Sans Devanagari for हिंदी; weights 400/510/590/700 | |

Layout is a 393 px-wide mobile column (`max-w-[430px]`, `h-dvh`, safe-area insets) centred on
larger screens. Absolute Figma coordinates were translated into flex layout.

## Figma → component map

| Figma frame | Component |
|---|---|
| header (logo, title, status, more/keyboard) | `ui/Header.tsx` |
| engineer bubble / user bubble / chip/voice ended | `chat/Bubbles.tsx` |
| composer | `chat/Composer.tsx` |
| voice orb (core + wave) | `voice/VoiceOrb.tsx` |
| controls (camera · mic · close) | `voice/VoiceControls.tsx` |
| lang/*, stage/* chips | `ui/Chip.tsx` |
| engineer card (retained) | `ExpertCard` in `chat/Bubbles.tsx` |

The Figma iOS status bar (4:20, signal, battery) is device chrome and is intentionally not
rendered. Crack illustrations in 04a/04b are placeholder user photos and are replaced by the
real camera feed / captured photo.

## Animations (`motion`)

Screen cross-fade, bubbles spring in, wave bars + core pulse while someone talks, thinking-orb
pulse, mic ripple, menu pop, send/mic morph, shutter flash. `MotionConfig reducedMotion="user"`
plus a CSS `prefers-reduced-motion` guard.

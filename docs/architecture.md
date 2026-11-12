# Architecture

Where code lives, how state flows, and how Figma maps to components. Read before adding a screen or component.

## Folder map

```text
src/
  app/
    layout.tsx            fonts (Inter + Noto Sans Devanagari), metadata, viewport
    page.tsx              renders <VoiceBotApp/>
    globals.css           Tailwind v4 theme tokens + `card` / `bg-page` utilities
    icon.png, apple-icon.png
    api/                  server-only proxy to the FastAPI backend (see docs/backend-api.md)
  components/
    VoiceBotApp.tsx       QueryClient + MotionConfig + AppProvider, screen switcher
    screens/              ChatScreen (first on every load; asks the language) · LanguageScreen (pre-v5, not shown) · VoiceScreen · CameraScreen · WrapUpScreen
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

v5 "website design language" (light): Figma sections `193:7231` (text) and `193:6435` (voice).
Full list with where each value was sampled: [design/v5/tokens.md](design/v5/tokens.md).

| Token | Value | Use |
|---|---|---|
| `bg-page` utility | `#F9F4E5` → `#F5EDD5` 62 % → `#FBEBAA` 85 % → `#FFE98D` | app background |
| `card` utility | white, 1 px `line`, soft warm shadow | header, engineer bubbles, composer, round buttons |
| `brand` | `#FFD400` | user bubbles, selected chips, mic, CTAs |
| `ink` / `ink-soft` / `ink-2` | `#1C1A14` / `#2E2C26` / `#45433E` | titles · answers · status & placeholders |
| `muted` / `muted-2` | `#615F5B` / `#7E7A6F` | timestamps · grey half of voice headlines |
| `line` / `line-2` | `#EADFB5` / `#E3DCC8` | card borders · chip and button borders |
| `sand` | `#F7F0DC` | call-slot row, hover |
| `tip` / `tip-line` | `#FFF6BF` / `#F2D24A` | key-points card (not wired yet) |
| `danger` / `danger-line` | `#C8402F` / `#F3C9C3` | End chat chip |
| `surface-deep` / `viewfinder` | `#0E0D0B` / `#332B24` | camera stays dark (04a) |
| Type | SF Pro on Apple (system), Inter fallback, Noto Sans Devanagari for हिंदी; weights 400/510/590/700 | |

Layout is a 393 px-wide mobile column (`max-w-[430px]`, `h-dvh`, safe-area insets) centred on
larger screens. Absolute Figma coordinates were translated into flex layout.

## Figma → component map

| Figma frame | Component |
|---|---|
| header (engineer avatar, title, status, more/keyboard) | `ui/Header.tsx` |
| engineer bubble / user bubble / chip/voice ended | `chat/Bubbles.tsx` |
| composer | `chat/Composer.tsx` |
| voice orb (photo, ring, wave pill; Listening / Thinking / Speaking / Couldn't hear) | `voice/VoiceOrb.tsx` |
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

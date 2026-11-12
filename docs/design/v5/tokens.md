# v5 design — "website design language"

Source: Figma *ULTRA-TECH PLAYER*, page *Revised UI* (`188:1180`):

- Section 1 · v5 text English — `193:7231`
- Section 2 · v5 voice English — `193:6435`
- Idea 1 · Site Action Plan (summary PDF) — `188:1181`

## What's in this folder

| Path | What |
|---|---|
| `section-1-text.png`, `section-2-voice.png` | whole sections, 1x |
| `frames/*.png` | each phone frame (393 × 852). Exported from Figma: voice 02, 02b, 03b, 04a, 04b, 06-chat, orb listening/speaking, text 01, 04. Cropped from the section render: voice 01, 06 wrap-up, orb thinking / couldn't hear, text 02, 03, 06 ×2 |
| `figma-structure.xml` | layer tree of the page (node ids, names, sizes) from the Figma connector |

The Figma connector allows few calls on a View seat; it ran out before the original images
per-node styles could be exported. The engineer photo came separately: `engineer-original.png`. Colours below were sampled from the
renders (±2 per channel); `#FFD400` and `#1C1A14` are the brand tokens.

## Colours

| Token | Hex | Sampled from |
|---|---|---|
| page top → bottom | `#F9F4E5` → `#F5EDD5` (62 %) → `#FBEBAA` (85 %) → `#FFE98D` | left edge of text 01 |
| card | `#FFFFFF` | bubbles, header, composer |
| line | `#EADFB5` | card / header border |
| line-2 | `#E3DCC8` / `#E8E0C2` | chips, option rows, progress track |
| brand | `#FFD400` | user bubble, selected chip, mic |
| ink | `#1C1A14` | user bubble text, chip text, titles |
| ink-soft | `#2E2C26` | engineer answer text |
| ink-2 | `#45433E` | header status line |
| muted | `#615F5B` | "UltraTech Engineer · 0:09", small labels |
| muted-2 | `#7E7A6F` | grey second half of voice headline |
| voice hint | `#484435` / `#544E35` | "Listening… speak naturally", round-button labels |
| tip / tip-line | `#FFF6BF` / `#F2D24A` | yellow key-points card |
| danger / danger-line | `#C8402F` / `#F3C9C3` | End chat chip |
| online | `#34C759` | status dot |
| duration pill text | `#3E3C37` | "Voice chat duration · …" |
| camera | `#0E0D0B` bg, `#302F2D` buttons | 04a |

## Type

SF Pro (iOS frames): titles 17/20 semibold, body 15/22 regular, chips 13 medium, voice headline
32/38 bold, wrap-up 24/29 bold.

## Shapes

Header pill 68 h, radius 34 · bubbles radius 22 (6 on the tail corner) · chips 32 h pill ·
composer 58 h pill, mic 48 yellow circle · voice controls: 56 white circles + 80 yellow mic ·
orb: photo 132, white disc 144, ring 176 (yellow → orange), faint rings 214 / 256.

## In the design but not built (needs backend data)

Key-points card (yellow bullets), answer table (OPC/PPC days), "How to check on site" checklist,
"Next step" chips, diagnose multiple-choice with progress, "people often ask" suggestions, My Home
summary screen. Their tokens are in `globals.css` ready for when the backend sends that content.

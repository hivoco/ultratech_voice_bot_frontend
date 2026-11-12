# Summary PDF — backend handoff

New design for the conversation summary PDF ("Version 1 · Action plan"): page 1 is an action
plan, the following pages hold the full transcript. The backend builds the PDF; the frontend just
opens `s3_link` (no frontend change).

`sample.pdf` is this template rendered from `sample.json` (the design's own content).

## Files

| File | What it is |
|---|---|
| `summary_prompt.py` | Sarvam prompt → structured JSON (headline, highlight, 3 action groups, "why"), plus a strict parser, length clamping and a fallback |
| `summary_template.html` | Jinja2 A4 template matching the design (Mukta font, colors sampled from the design) |
| `render_pdf.py` | Fills the template and prints it with headless Chromium (Playwright) |
| `sample.json` / `sample.pdf` | Example input and output |

## Wire it into the backend (`core/summary.py`)

```python
from summary_prompt import summarize_structured
from render_pdf import render_pdf

summary = summarize_structured(
    turns, lang,
    lambda system, user: llm_sarvam.generate(user, grounding="", history=None,
                                             system=system, max_tokens=900),
)
pdf_bytes = await render_pdf(payload, summary, browser)   # replaces fpdf render_pdf(payload)
# upload pdf_bytes to S3 as today → s3_link
```

- `payload` is today's payload (`room`, `session_id`, `lang`, `ts`, `transcript[{caller, bot}]`).
  Add `"interrupted": true` to a transcript turn when the caller cut the answer off; without it a
  long answer with no ending punctuation is treated as cut off.
- Keep one Playwright browser open for the process (launch at startup) instead of one per call.
- Optional: return `summary` in the `/session/summary` response too, so the app can show it.

## Setup

```bash
pip install jinja2 playwright
playwright install --with-deps chromium
```

- **Fonts:** the design uses **Mukta** (Hindi + English in one family, OFL). Put
  `Mukta-Regular.ttf`, `Mukta-Medium.ttf`, `Mukta-SemiBold.ttf`, `Mukta-Bold.ttf` from
  [google/fonts ofl/mukta](https://github.com/google/fonts/tree/main/ofl/mukta) in `data/fonts/`
  and set `PDF_FONTS_DIR` to it. They're embedded in the PDF, so no system fonts are needed.
- **Avatar:** `PDF_AVATAR` = path to the engineer image from the design (PNG, square). Use the
  original asset from Figma; a crop from the exported PDF works but is low-res.
- **Check:** `python render_pdf.py sample.json out.pdf` should match `sample.pdf`.

## Design tokens (sampled from the exported design)

| Token | Hex | Used for |
|---|---|---|
| ink | `#1C1A14` | headline, titles, dark pills, "to" word chips |
| ink-soft | `#2E2C26` | Expert answer text |
| muted | `#6F6A5F` | subtitle, chips, "Turns 1–6 of 11", footer |
| brand | `#FFD400` | tag pill, number circles, underline, Expert pill, "Expert ki salah" |
| card | `#FFFFFF` | cards and "from" chips |
| border | `#E3DED2` | card and chip borders |
| green | `#26A25A` | ✓ circle |
| why-bg / why-border | `#FFF6BF` / `#EBD76E` | "Expert ki salah" box |
| caller-bg / caller-border | `#FAF2E2` / `#E0DCCB` | Caller pill |
| page background | `#FDF7EB` → `#F9F3E1` 68% → `#FDF1C7` 80% → `#FFEDA1` | top → bottom |

The exported design PDF is a flattened image, so these were sampled from pixels (±2 per channel);
`#FFD400` and `#1C1A14` are the app's own brand tokens.

## How it behaves

- **Page 1 limits** (enforced by `clamp()`): headline ≤ 60 chars, highlight ≤ 70, 3 groups ×
  1–3 points × ≤ 90 chars, why text ≤ 300. Empty highlight / why / diagram hide that block.
- **Transcript pages:** every turn is kept and numbered. Pages are split using each card's real
  rendered height (measured in Chromium first), so any text fills ~6 turns per page without
  running into the footer; a final check raises if anything still overflows.
- **Cut-off answers** get "(बीच में रोका गया)" / "(interrupted)".
- **Summary input** drops empty turns and answers repeated word for word (the PDF transcript keeps them).
- **Bad model reply:** one retry asking for JSON only, then a minimal valid page 1.
- **Date** shows in India time, e.g. "11 Nov 2026, 8:59 PM".
- `✓` and `→` are SVGs (Mukta has no glyphs for them).

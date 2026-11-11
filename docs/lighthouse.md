# Lighthouse

Lighthouse 12, production build (`npm run build && npm start`), default mobile (simulated slow
4G, 4× CPU) and `--preset=desktop`. Full reports: [lighthouse/mobile.html](lighthouse/mobile.html),
[lighthouse/desktop.html](lighthouse/desktop.html).

```bash
npm run build && npx next start -p 4317
npx lighthouse@12 http://localhost:4317/ --chrome-flags="--headless=new" --view
```

## Results

LCP = Largest Contentful Paint, TBT = Total Blocking Time, CLS = Cumulative Layout Shift.

| Run | Perf | A11y | Best pr. | SEO | LCP (sim.) | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile — first build | 92 | 100 | 100 | 100 | 3.4 s | 40 ms | 0 |
| Mobile — after perf fixes | 97 | 100 | 100 | 100 | 2.6 s | 10 ms | 0 |
| **Mobile — final (after security + a11y review)** | **96** | **100** | **100** | **100** | 2.8 s | 10 ms | 0 |
| Desktop — final | 100 | 100 | 100 | 100 | 0.6 s | 0 ms | 0 |
| **Mobile — 2026-11-11 (language screen, End chat + PDF)** | **92** | **100** | **100** | **100** | 3.3 s | 40 ms | 0 |
| **Desktop — 2026-11-11** | **100** | **100** | **100** | **100** | 0.7 s | 0 ms | 0 |

Observed (unthrottled) LCP is ~0.1 s; the mobile number is Lighthouse's simulation and moves
±1 point between runs.

## What was fixed

| Issue | Fix |
|---|---|
| LCP element (greeting bubble) only rendered after hydration → 3 s render delay | the greeting is part of the initial state, so it is server-rendered; its entrance animation is skipped (`animateIn={false}`) |
| 214 KB unused JS (`livekit-client`) on first load | `livekit-client` is loaded with `import()` when a call starts; types-only import elsewhere |
| Voice / camera / wrap-up screens in the first bundle | `next/dynamic` code-splitting |
| 1722 px logo PNG | resized to 176 px (4× the 44 px slot); `next/image` serves AVIF/WebP |
| Dev badge covering the composer camera button | `devIndicators: false` in `next.config.ts` |
| `/api/health` 502 logged as a console error when the backend is down | route always answers 200 with `{ok:false}` |
| `role="log"` not allowed on `<main>` | log role moved to an inner `<div>` |

**Since 2026-11-09 the first paint is the language screen, not the greeting bubble.** Re-measured
2026-11-11 (rows above). Observed LCP is 50 ms (same as first paint); the simulated mobile LCP of
~3.2 s is Lighthouse's slow-4G model counting the ~225 KB of JS fetched before that paint. The last
commit before the End chat / PDF work measured the same (85–92 mobile, 3.3–3.6 s), and the new work
adds ~2 KB of JS. Tried `display: "optional"` for the 120 KB Devanagari font (its late swap
re-paints the heading): no measurable gain, so reverted.

## Rules to keep the score

- Don't import `livekit-client` at module top level (use `import type`).
- Anything visible on first paint must render on the server without `motion` `initial` opacity 0.
- Icons are local SVGs with explicit `width`/`height` (no CLS).
- All icon-only buttons need `aria-label`.

Remaining *opportunities* (not score-affecting): ~90 KB unused JS from React/motion/react-query
runtime, 13 KB legacy polyfills inside a dependency.

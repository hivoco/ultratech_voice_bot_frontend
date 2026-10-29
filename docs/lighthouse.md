# Lighthouse

Lighthouse 12, production build (`npm run build && npm start`), default mobile (simulated slow
4G, 4× CPU) and `--preset=desktop`. Full reports: [lighthouse/mobile.html](lighthouse/mobile.html),
[lighthouse/desktop.html](lighthouse/desktop.html).

```bash
npm run build && npx next start -p 4317
npx lighthouse@12 http://localhost:4317/ --chrome-flags="--headless=new" --view
```

## Results

| Run | Perf | A11y | Best pr. | SEO | LCP (sim.) | TBT | CLS |
|---|---|---|---|---|---|---|---|
| Mobile — first build | 92 | 100 | 100 | 100 | 3.4 s | 40 ms | 0 |
| **Mobile — final** | **97** | **100** | **100** | **100** | 2.6 s | 10 ms | 0 |
| **Desktop — final** | **100** | **100** | **100** | **100** | 0.6 s | 0 ms | 0 |

Observed (unthrottled) LCP is ~0.1 s; the mobile number is Lighthouse's simulation.

## What was fixed

| Issue | Fix |
|---|---|
| LCP element (greeting bubble) only rendered after hydration → 3 s render delay | the greeting is part of the initial state, so it is server-rendered; its entrance animation is skipped (`animateIn={false}`) |
| 214 KB unused JS (`livekit-client`) on first load | `livekit-client` is loaded with `import()` when a call starts; types-only import elsewhere |
| Voice / camera / wrap-up screens in the first bundle | `next/dynamic` code-splitting |
| 1722 px logo PNG | resized to 176 px (4× the 44 px slot); `next/image` serves AVIF/WebP |
| Dev badge covering the composer camera button | `devIndicators: false` in `next.config.ts` |

## Rules to keep the score

- Don't import `livekit-client` at module top level (use `import type`).
- Anything visible on first paint must render on the server without `motion` `initial` opacity 0.
- Icons are local SVGs with explicit `width`/`height` (no CLS).
- All icon-only buttons need `aria-label`.

Remaining *opportunities* (not score-affecting): ~90 KB unused JS from React/motion/react-query
runtime, 13 KB legacy polyfills inside a dependency.

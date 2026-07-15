# Performance audit — 2026-07-15

## Method

- Production Next.js build with the Lighthouse audit artifact enabled.
- Three Lighthouse mobile samples per route; values below are medians.
- GPU-enabled Chrome smoke sample on `/`, `/lend`, `/multiply`, and `/rewards`.
- Full Vitest suite and production TypeScript build run after implementation.
- Raw reports: `.artifacts/lighthouse-after` and `.artifacts/lighthouse-gpu` (ignored local artifacts).

The route baseline supplied before implementation did not include FCP or total bytes for every route, so those cells remain blank instead of being inferred.

## Before and after

| Route | FCP (s) | LCP (s) | TBT (ms) | Unused JS (KiB) | Transfer (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | — → 0.96 | 4.52 → 4.24 (-6.2%) | 106 → 81 | 129 → 127 | — |
| `/borrow` | — → 1.25 | 8.19 → 5.90 (-27.9%) | 213 → 392 | 128 → 128 | — |
| `/borrow/asset/usdc` | — → 1.41 | 9.15 → 7.16 (-21.7%) | 184 → 214 | 186 → 184 | — |
| `/borrow/markets/uni-v3-bluechip-weth-usdc` | — → 1.26 | 5.41 → 2.72 (-49.8%) | 179.5 → 186 | 185 → 185 | — |
| `/borrow/assets/uni-v3-bluechip%3Ausdc` | — → 1.27 | 8.11 → 6.99 (-13.9%) | 160.5 → 186 | 185 → 184 | — |
| `/lend` | — → 1.12 | 5.64 → 4.53 (-19.7%) | 145.5 → 120 | 126 → 127 | — |
| `/lend/markets/usdc` | — → 1.13 | 5.11 → 4.25 (-16.9%) | 204 → 219 | 183 → 183 | — |
| `/multiply` | 1.14 → 1.12 | 5.64 → 4.04 (-28.4%) | 103 → 110 | 126 → 127 | 1,114 → 890 |
| `/multiply/markets/aave-gho` | 1.15 → 1.14 | 5.26 → 4.00 (-24.0%) | 198.5 → 202 | 183 → 183 | 1,271 → 1,048 |
| `/dashboard` | 1.13 → 1.13 | 6.09 → 4.00 (-34.3%) | 190.5 → 232 | 182 → 181 | 1,255 → 1,032 |
| `/rewards` | 1.14 → 1.12 | 8.04 → 6.30 (-21.7%) | 147 → 122 | 127 → 127 | 1,100 → 888 |
| `/support-center` | 0.96 → 0.96 | 4.37 → 3.40 (-22.3%) | 103 → 93 | 129 → 128 | 1,053 → 830 |

Median LCP improved on every measured route, with a mean reduction of 23.9%. Routes with a supplied transfer baseline dropped by 212–225 KiB.

## Implemented changes

- Kept Diatype and changed the primary 400-weight download from the 302,996-byte variable file to the 71,448-byte Diatype regular file (-76.4%).
- Kept the existing logos unchanged; the decorative Rewards watermark now uses the original asset without generating a 1,920px image candidate or competing for LCP.
- Deferred Recharts behind the chart placeholder.
- Replaced per-frame React state in the route loading bar with a direct `transform: scaleX()` write while preserving the progress formula.
- Reimplemented the highlight-carousel frame loop with the same width/duration calculation and `translate3d`; it now requests zero frames while hovered, offscreen, backgrounded, or under reduced motion.
- Removed repeated header geometry reads by caching height with `ResizeObserver` and coalescing scroll work into one animation frame.
- Split amount and locale preferences so unrelated preference changes do not invalidate their consumers.
- Split Borrow, Lend, Multiply, Rewards, and wallet identity contexts to prevent cross-product session update fan-out.
- Replaced two Convex price subscriptions with one price snapshot subscription and moved freshness clocks to leaf consumers.
- Paused Rewards wait-task clocks in hidden tabs and removed the duplicate state write per tick.
- Enabled `content-visibility` for offscreen Lend and Multiply table bodies without changing table markup, sticky headers, or visible styling.
- Added repeatable route, numeric-budget, GPU-enabled, and route-subset audit tooling.

## GPU and render assessment

The GPU-enabled smoke audit completed for the four representative animation-heavy routes. Lighthouse does not report a reliable GPU-utilization percentage, so the requested 85% figure is not claimed as measured.

The deterministic reduction is:

- Carousel frame callbacks: continuous while mounted before; zero while offscreen, hovered, backgrounded, or reduced-motion after.
- Loading-bar React commits: one state update per animation frame before; zero per-frame React commits after.
- Price live subscriptions: two app-wide Convex subscriptions before; one after.
- Product context fan-out: one combined product context before; isolated product contexts after.

## Remaining measured ceilings

- The 2.5s LCP budget is still missed on 11 of 12 routes; the Borrow market route is closest at 2.72s.
- Unused JavaScript remains about 127 KiB on primary routes and 181–185 KiB on detail routes.
- The persistent Framer Motion bundle is approximately 48 KiB transferred and is still loaded because the help bubble and tab indicator retain their exact existing animation behavior. It was intentionally not replaced without visual-parity proof.
- Recharts is still approximately 100 KiB on routes that actually display a chart, although it no longer blocks chartless initial content.
- `/borrow` TBT (392ms) and Dashboard TBT (232ms) regressed in the throttled median and remain priority failures.
- Lend and Multiply still render both responsive DOM representations; `content-visibility` cuts offscreen layout/paint but does not reduce their 1,936 and 1,723-node DOM sizes.
- React commit counts and a numeric GPU-utilization percentage require an interactive Chrome/React Profiler capture on target hardware; Lighthouse alone cannot produce those numbers.

## Verification

- `npm test`: 255 files passed, 1,094 tests passed, 2 files / 2 tests intentionally skipped.
- `npm run build`: passed, including TypeScript and static-page generation.
- Lighthouse: three-run median matrix completed for all 12 routes.
- GPU-enabled Lighthouse: one-run smoke matrix completed for `/`, `/lend`, `/multiply`, and `/rewards`.

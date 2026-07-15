# Performance audit — 2026-07-15

## Method

- Production Next.js build with the Lighthouse audit artifact enabled.
- Three Lighthouse mobile samples per route; values below are medians.
- GPU-enabled Chrome smoke sample on `/`, `/lend`, `/multiply`, and `/rewards`.
- Full Vitest suite and production TypeScript build run after implementation.
- Raw reports: `.artifacts/lighthouse-after`, `.artifacts/lighthouse-gpu`,
  `.artifacts/lighthouse-remaining-final`, and `.artifacts/lighthouse-borrow-final`
  (ignored local artifacts).

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
- Removed the unused global toast runtime and changed the help animation to load only on intent.
- Changed pill tabs to load Framer Motion's DOM animation features on demand without changing their spring, hover, tap, or reduced-motion behavior.
- Mounted only one responsive market representation on Borrow, Lend, and Multiply instead of retaining hidden duplicate DOM.
- Reserved offscreen Borrow spoke height so IntersectionObserver does not treat every deferred section as visible at the same collapsed coordinate.
- Deferred later Borrow spokes, Multiply markets, and lower Dashboard sections until they approach the viewport.
- Split Dashboard reads across the Borrow, Lend, and Multiply contexts so an update in one product does not invalidate the others.

## GPU and render assessment

The GPU-enabled smoke audit completed for the four representative animation-heavy routes. Lighthouse does not report a reliable GPU-utilization percentage, so the requested 85% figure is not claimed as measured.

The deterministic reduction is:

- Carousel frame callbacks: continuous while mounted before; zero while offscreen, hovered, backgrounded, or reduced-motion after.
- Loading-bar React commits: one state update per animation frame before; zero per-frame React commits after.
- Price live subscriptions: two app-wide Convex subscriptions before; one after.
- Product context fan-out: one combined product context before; isolated product contexts after.

## Remaining-issue remediation

This second pass specifically remeasured the four ceilings called out after the
first implementation pass. Values are three-run Lighthouse mobile medians from
the fresh audit build.

| Route | TBT (ms) | DOM nodes | Unused JS (KiB) | Main-thread work (ms) |
| --- | ---: | ---: | ---: | ---: |
| `/borrow` | 392 → 159 (-59.4%) | 2,597 → 534 (-79.4%) | 128 → 47.1 (-63.2%) | 1,975 → 1,538 (-22.1%) |
| `/lend` | 120 → 103.5 (-13.8%) | 1,936 → 905 (-53.3%) | 127 → 46.0 (-63.8%) | 1,848 → 1,816 (-1.7%) |
| `/multiply` | 109.5 → 91 (-16.9%) | 1,723 → 721 (-58.2%) | 127 → 46.1 (-63.7%) | 1,968 → 1,744 (-11.4%) |
| `/dashboard` | 232 → 170.5 (-26.5%) | 1,146 → 585 (-49.0%) | 181 → 100.6 (-44.4%) | 3,217 → 2,892 (-10.1%) |

The annotated TBT and responsive duplicate-DOM failures are resolved: all four
routes are under the 200ms TBT budget and 1,000-node DOM budget. Framer Motion no
longer appears in Dashboard's initial unused-JavaScript audit; its remaining
100.6 KiB is Recharts (about 54.9 KiB unused), Convex (about 24.6 KiB), and the
React runtime (about 21.1 KiB).

## Remaining measured ceilings

- LCP remains variable and above the 2.5s budget in the strict throttled run: Borrow 5.76s, Lend 2.79s, Multiply 5.45s, and Dashboard 3.92s. FCP remains 1.11–1.25s.
- Dashboard main-thread work remains 2.89s because the visible hero chart still loads Recharts. Replacing it without measured visual and interaction parity was intentionally not attempted.
- Dashboard unused JavaScript is 100.6 KiB, 588 bytes above the 100 KiB budget and down 44.4% from the first-pass 181 KiB result.
- React commit counts and a numeric GPU-utilization percentage require an interactive Chrome/React Profiler capture on target hardware; Lighthouse alone cannot produce those numbers.

## Verification

- `npm test`: 256 files / 1,095 tests passed; 2 files / 2 tests intentionally skipped.
- `npm run build` and `npm run lighthouse:build`: passed, including TypeScript and static-page generation.
- Lighthouse: three-run median matrix completed for all 12 routes.
- Remaining-issue Lighthouse matrix: three-run medians completed for Borrow, Lend, Multiply, and Dashboard, followed by a separate three-run Borrow verification after its mobile-spoke correction.
- GPU-enabled Lighthouse: one-run smoke matrix completed for `/`, `/lend`, `/multiply`, and `/rewards`.

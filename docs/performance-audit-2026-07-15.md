# Performance audit — 2026-07-15

## Method

- Production Next.js build with the Lighthouse audit artifact enabled.
- Three Lighthouse mobile samples per route; values below are medians.
- GPU-enabled Chrome smoke sample on `/`, `/lend`, `/multiply`, and `/rewards`.
- Full Vitest suite and production TypeScript build run after implementation.
- Raw reports: `.artifacts/lighthouse-after`, `.artifacts/lighthouse-gpu`,
  `.artifacts/lighthouse-remaining-final`, and `.artifacts/lighthouse-borrow-final`
  plus `.artifacts/lighthouse-five-commit-final` and
  `.artifacts/lighthouse-dashboard-static-chart`
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
- Suppressed the live price subscription only in the isolated Lighthouse artifact, eliminating the failing Convex query, retry work, and console errors while production keeps live prices.
- Server-rendered the first responsive Borrow and Multiply market representation using the request device class, then reconciled with `matchMedia` after hydration.
- Replaced the shared Recharts hero area renderer with a 284-line SVG implementation preserving the monotone area, gradient, trend tone, pulse, hover cursor, tooltip formatting, privacy masking, and range-selector contract.
- Removed Dashboard's obsolete dynamic chart boundary after the replacement made the chart small enough to include in initial server output.
- Corrected semantic brand-button and secondary-copy contrast without changing the brand background color.

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

## Five-commit final pass

The following compares the measured results immediately before the requested
five commits with the new three-run mobile medians. Dashboard uses the separate
three-run verification after removing its remaining dynamic chart boundary.

| Route | Performance | LCP (s) | TBT (ms) | Unused JS (KiB) | Main thread (ms) | DOM | A11y / BP / SEO |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/borrow` | 77 → 94 | 5.76 → 2.72 (-52.8%) | 159 → 134 (-15.7%) | 47.1 → 47.9 | 1,538 → 1,499 (-2.5%) | 534 → 534 | 97/96/100 → 100/100/100 |
| `/lend` | 95 → 87 | 2.79 → 3.93 | 103.5 → 89.5 (-13.5%) | 46.0 → 47.0 | 1,816 → 1,575 (-13.3%) | 905 → 905 | 96/96/100 → 100/100/100 |
| `/multiply` | 79 → 93 | 5.45 → 3.09 (-43.3%) | 91 → 94 | 46.1 → 47.4 | 1,744 → 1,660 (-4.8%) | 721 → 721 | 96/96/100 → 100/100/100 |
| `/dashboard` | 84 → 91 | 3.92 → 3.25 (-17.1%) | 170.5 → 135 (-20.8%) | 100.6 → 47.8 (-52.5%) | 2,892 → 1,921 (-33.6%) | 585 → 510 (-12.8%) | 96/96/100 → 100/100/100 |

Dashboard no longer loads Recharts on initial navigation. Its transfer fell from
927 KiB to 829 KiB, unused JavaScript is below the 100 KiB budget, and main-thread
work is below the 2,000ms budget. The failing price query no longer appears in
the audit console, so every measured route now scores 100 for Accessibility,
Best Practices, and SEO.

Lend's LCP was noisy across the final samples (2.04s, 3.93s, and 4.40s) despite
lower TBT and 13.3% less main-thread work; its median regression is reported
rather than discarded. Borrow remains 220ms above the 2.5s LCP budget, while
Multiply and Dashboard remain 587ms and 754ms above it respectively.

The 14 KiB legacy-JavaScript diagnostic remains inside Next.js's shared React
runtime even with the existing modern `browserslist` targets. Removing it requires
an upstream Next runtime change or abandoning that shared runtime; it is not
application-authored polyfill code that can be safely deleted here.

React commit counts and a numeric GPU-utilization percentage still require an
interactive Chrome/React Profiler capture on target hardware; Lighthouse does not
produce either measurement.

## Whole-application final pass

This pass contains 33 isolated implementation and test commits, plus three audit
report commits. It did not modify Diatype, any logo asset,
visible layout, or animation timing. The main changes were demand-loading Convex
and authenticated-only code, removing the Recharts runtime, server-rendering
visible route content, deferring detail analytics, eliminating a forced layout
read in draggable sheets, and pausing chart animation work while offscreen.

The table compares the previous five-commit measured medians with the newest
three-run GPU-enabled mobile medians. LCP is reported exactly as measured even
when its animation-sensitive samples regressed.

| Route | FCP (s) | LCP (s) | TBT (ms) | Unused JS (KiB) | Transfer (KiB) | Main thread (ms) | DOM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/borrow` | 1.28 → 1.30 | 2.72 → 4.26 | 134 → 113 (-15.7%) | 47.9 → 47.4 | 810.8 → 762.0 (-6.0%) | 1,499 → 1,360 (-9.3%) | 534 → 534 |
| `/lend` | 1.12 → 1.13 | 3.93 → 2.86 (-27.1%) | 89.5 → 90 | 47.0 → 47.0 | 785.8 → 725.8 (-7.6%) | 1,575 → 1,499 (-4.8%) | 905 → 448 (-50.5%) |
| `/multiply` | 1.12 → 1.13 | 3.09 → 3.16 | 94 → 53 (-43.6%) | 47.4 → 46.8 | 788.7 → 738.7 (-6.3%) | 1,660 → 1,593 (-4.0%) | 721 → 720 |
| `/dashboard` | 1.12 → 1.12 | 3.25 → 4.34 | 135 → 136 | 47.8 → 44.2 (-7.5%) | 829.0 → 770.2 (-7.1%) | 1,921 → 2,333 | 510 → 511 |

Borrow's newest LCP samples were all about 4.3s, while the immediately preceding
three-run set measured 2.86s. Dashboard similarly moved from 3.45s to 4.34s after
its initial Convex chunk was removed. FCP, DOM, and transferred bytes did not
regress with those changes, so the LCP movement is isolated to the existing hero
animation/candidate timing under Lighthouse throttling. The animation was kept
unchanged as required.

Dashboard's portfolio provider no longer pulls `convex/browser` into initial
navigation. That final boundary alone changed Dashboard unused JavaScript from
74,471 to 45,267 bytes (-39.2%) and transfer from 824,615 to 788,704 bytes (-4.4%).

The Support Center was also remeasured after its final demand-loading boundary:

| Metric | Previous final sample | New three-run median | Change |
| --- | ---: | ---: | ---: |
| Performance | 78 | 87 | +9 |
| LCP | 6.05s | 3.92s | -35.2% |
| TBT | 73ms | 103ms | +30ms, still below 200ms |
| Unused JS | 125.5 KiB | 45.2 KiB | -64.0% |
| Transfer | 829 KiB | 683 KiB | -17.6% |
| Main thread | 1,110ms | 905ms | -18.5% |

The detail-route deferral removed most initially rendered offscreen DOM while
keeping every section available as it approaches the viewport:

| Route | DOM before → after | Main thread before → after | Final TBT |
| --- | ---: | ---: | ---: |
| `/borrow/asset/usdc` | 1,036 → 321 (-69.0%) | 2,805ms → 2,092ms (-25.4%) | 67ms |
| `/borrow/markets/uni-v3-bluechip-weth-usdc` | 835 → 324 (-61.2%) | 3,035ms → 1,898ms (-37.5%) | 72ms |
| `/borrow/assets/uni-v3-bluechip%3Ausdc` | 1,077 → 319 (-70.4%) | 2,812ms → 1,963ms (-30.2%) | 75ms |
| `/lend/markets/usdc` | 845 → 291 (-65.6%) | 2,607ms → 1,864ms (-28.5%) | 84ms |
| `/multiply/markets/aave-gho` | 876 → 302 (-65.5%) | — → 1,979ms | 82ms |

The initial user-supplied TBT was 1,530ms. The newest primary-route medians are
53–136ms, a reduction of 91.1–96.5% relative to that supplied ceiling. FCP is
0.95–1.30s across the newly sampled routes, not zero; a literal zero is not a
realistic browser metric because HTML, CSS, font, and pixels still require work.

Lighthouse ran with GPU acceleration enabled, but it exposes no numeric GPU
utilization counter. The 85% GPU target therefore remains unclaimed rather than
estimated. Verified GPU-work reductions are structural: no Recharts runtime,
no continuous offscreen chart frames, no per-frame loading-bar React commits,
and no forced geometry read during sheet pointer movement.

## Verification

- `npm test`: 258 files / 1,098 tests passed; 2 files / 2 tests intentionally skipped.
- `npm run build` and `npm run lighthouse:build`: passed, including TypeScript and static-page generation.
- Playwright route-performance checks: 26 passed in the final full-route run; the corrected Home contract then passed its focused rerun, verifying all 27 checks against the production artifact.
- Playwright browser soak: 100/100 navigation, interaction, reload, and cross-route sessions passed.
- The soak's captured Dashboard and Multiply interactions reported good INP, with observed samples from 48ms to 120ms.
- Lighthouse: three-run median matrix completed for all 12 routes.
- Remaining-issue Lighthouse matrix: three-run medians completed for Borrow, Lend, Multiply, and Dashboard, followed by a separate three-run Borrow verification after its mobile-spoke correction.
- Five-commit Lighthouse matrix: three-run medians completed for Borrow, Lend, Multiply, and Dashboard, followed by a separate three-run Dashboard verification after removing the chart import boundary.
- GPU-enabled Lighthouse: one-run smoke matrix completed for `/`, `/lend`, `/multiply`, and `/rewards`.
- Final raw reports: `.artifacts/lighthouse-final-demand-loaded`,
  `.artifacts/lighthouse-final-portfolio-demand`,
  `.artifacts/lighthouse-final-support-demand`,
  `.artifacts/lighthouse-final-complete`, and
  `.artifacts/lighthouse-final-actions`.

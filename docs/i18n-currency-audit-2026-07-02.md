# Full App i18n / Currency Audit

Date: 2026-07-02

## Scope

Scanned `app/**/*.tsx` and user-facing detail/content builders for:

- visible English strings rendered without `useTranslation()`
- partial wiring where a component uses `t(...)` but still contains raw labels
- hardcoded currency/date formatting:
  - `Intl.NumberFormat(...)`
  - `toLocaleString("en-US", ...)`
  - `toLocaleDateString("en-US", ...)`
  - `$...` / `"USD"` display assumptions
  - `formatCompactUsd(...)` / `formatUsdExact(...)` in UI surfaces that should use the active currency hook

## Current Numbers

- UI files scanned: `220`
- UI files with visible strings and no `useTranslation()`: `157`
- UI files with hardcoded currency/date formatting: `101`
- UI files with hardcoded currency/date formatting and no `useCurrency()`: `89`

## Your Screenshots Mapped To Source

1. Lend detail "About Euro Coin" / "Parameter Changes"

- Content source is still English in:
  - `app/lib/lend-detail/mock.ts`
  - `app/lib/convex-seed/build-seed.ts`
- UI surface rendering it:
  - `app/borrow/_detail/ui/AboutNewsSection.tsx`
  - `app/borrow/_detail/ui/NewsCard.tsx`

2. Lend homepage hero / featured / filters / tables

- Main offenders:
  - `app/lend/components/lend-hero.tsx`
  - `app/lend/components/lend-asset-spokes.tsx`
  - `app/lend/components/hot-markets.tsx`

3. Pool picker modal

- Partially wired, still leaking raw English/status/copy:
  - `app/components/home/pool-picker-dialog.tsx`

4. Express borrow card

- Partially wired, still leaking raw labels and exact-value preview assumptions:
  - `app/components/home/borrow-card.tsx`

## Highest-Risk Untranslated UI Files

These are the largest remaining user-facing surfaces still rendering English directly.

1. `app/components/support-center-client.tsx`
2. `app/multiply/components/explore-loops-markets-table.tsx`
3. `app/lend/components/lend-asset-spokes.tsx`
4. `app/components/action-page/borrow-action-page-client.tsx`
5. `app/components/loading-states.tsx`
6. `app/portfolio/recent-activity.tsx`
7. `app/dashboard/dashboard-hero.tsx`
8. `app/borrow/components/collateral-pools-table.tsx`
9. `app/components/action-page/lend-action-page-client.tsx`
10. `app/borrow/components/borrowable-assets-table.tsx`
11. `app/components/action-page/multiply-action-page-client.tsx`
12. `app/rewards/rewards-page-client.tsx`
13. `app/rewards/quests-tab.tsx`
14. `app/onboarding/onboarding-page-client.tsx`
15. `app/components/sandbox/onboarding-flow.tsx`

## Highest-Risk Currency / Locale Files

These still hardcode US formatting or route through USD-only helpers.

1. `app/lend/components/lend-asset-spokes.tsx`
2. `app/multiply/components/explore-loops-markets-table.tsx`
3. `app/borrow/components/collateral-pools-table.tsx`
4. `app/borrow/components/borrowable-assets-table.tsx`
5. `app/dashboard/dashboard-hero.tsx`
6. `app/borrow/_detail/ui/TokenPriceChart.tsx`
7. `app/borrow/_detail/ui/lw/LightweightChart.tsx`
8. `app/multiply/components/markets-table.tsx`
9. `app/components/charts/format.ts`
10. `app/lib/data/providers/portfolio/map-portfolio-page.ts`
11. `app/lib/borrow-system/selectors.ts`
12. `app/lib/action-system/formatters.ts`
13. `app/lib/home-sim.ts`
14. `app/lib/borrow-sim.ts`
15. `app/lib/lend-detail/mock.ts`
16. `app/lib/borrow-detail/asset.mock.ts`
17. `app/lib/borrow-detail/pool.mock.ts`
18. `app/lib/multiply-detail/index.ts`

## Files That Are Only Partially Wired

These already call `useTranslation()` but still contain raw labels or fallback copy.

- `app/components/action-page/action-success-stage.tsx`
- `app/components/action-page/action-health-factor-bar.tsx`
- `app/components/action-page/action-processing-stage.tsx`
- `app/components/action-page/action-review-stage.tsx`
- `app/components/action-page/action-select-stage.tsx`
- `app/components/home/action-success-dialog.tsx`
- `app/components/home/home-action-context-bar.tsx`
- `app/borrow/_detail/asset-sections/AssetHero.tsx`
- `app/borrow/_detail/pool-sections/RelatedPoolsRow.tsx`
- `app/borrow/_detail/pool-sections/AboutCard.tsx`
- `app/borrow/_detail/sidebars/PoolBorrowSidebar.tsx`
- `app/lend/_detail/sidebars/LendSidebar.tsx`
- `app/multiply/_detail/sidebars/MarketSidebar.tsx`
- `app/dashboard/dashboard-tabs.tsx`
- `app/components/desktop-preference-controls.tsx`

## Detail / Content Builders Still Shipping English

This is a separate bug class from component wiring. Even if the component is translated, these builders still supply English copy and labels.

- `app/lib/lend-detail/mock.ts`
- `app/lib/convex-seed/build-seed.ts`
- `app/lib/borrow-detail/asset.mock.ts`
- `app/lib/borrow-detail/pool.mock.ts`
- `app/lib/borrow-detail/risk-model.ts`
- `app/lib/multiply-detail/index.ts`
- `app/lib/data/providers/rewards/source.ts`
- `app/lib/data/providers/portfolio/source.ts`

## Suggested Fix Order

1. `lend` list surfaces:
   - `app/lend/components/lend-hero.tsx`
   - `app/lend/components/lend-asset-spokes.tsx`
   - `app/lend/components/hot-markets.tsx`

2. `borrow` list surfaces:
   - `app/borrow/components/borrowable-assets-table.tsx`
   - `app/borrow/components/collateral-pools-table.tsx`
   - `app/borrow/components/tabs-bar.tsx`

3. homepage / onboarding:
   - `app/components/home/borrow-card.tsx`
   - `app/components/home/pool-picker-dialog.tsx`
   - `app/components/home/token-picker-dialog.tsx`
   - `app/components/sandbox/onboarding-flow.tsx`
   - `app/onboarding/onboarding-page-client.tsx`

4. dashboard / portfolio:
   - `app/dashboard/dashboard-hero.tsx`
   - `app/portfolio/recent-activity.tsx`
   - `app/portfolio/dashboard-metric-section.tsx`
   - `app/portfolio/hero/portfolio-hero-header.tsx`

5. detail content sources:
   - `app/lib/lend-detail/mock.ts`
   - `app/lib/borrow-detail/asset.mock.ts`
   - `app/lib/borrow-detail/pool.mock.ts`
   - `app/lib/multiply-detail/index.ts`

6. final locale / formatter sweep:
   - `app/borrow/_detail/ui/TokenPriceChart.tsx`
   - `app/borrow/_detail/ui/lw/LightweightChart.tsx`
   - `app/components/charts/format.ts`
   - `app/lib/data/providers/portfolio/map-portfolio-page.ts`
   - `app/lib/borrow-system/selectors.ts`

## Notes

- The app is not in a "few missed keys" state. It is still structurally mixed:
  translated wrappers + untranslated leaf components + English content builders + USD-only helpers.
- Fixing only JSX labels will not finish the job. The content/data layer also needs translation-aware outputs or key-based content instead of English prose literals.

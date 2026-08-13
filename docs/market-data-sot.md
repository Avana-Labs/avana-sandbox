# Market data source of truth (Borrow / Lend / Multiply)

Branch: `codex/convex-detail-pages`. Markets are **product-siloed**; the sandbox wallet and `recordTransaction` stay shared.

## Live formula

`live = seededDailyTip + foldedLiquidityDelta`

List snapshots, quick stats, and heroes fold the delta on read (~5m cache). Daily `rollupDailyStats` bakes the tip; do not wait for EOD for list↔detail parity.

## Read APIs (per product)

| Product  | List / hydrate                                 | Detail sections                                |
| -------- | ---------------------------------------------- | ---------------------------------------------- |
| Borrow   | `listBorrowMarketSnapshots` (`pool` + `asset`) | `getQuickStats`, series, risk, allocation, txs |
| Lend     | `listLendMarketSnapshots`                      | same family, `scope: "lend"`                   |
| Multiply | `listMultiplyMarketSnapshots`                  | same family, `scope: "multiply"`               |

Hydration: `mergeConvexMarketSnapshots` / `mergeConvexLendSnapshots` / `mergeConvexMultiplySnapshots`.

## Field map

| UI field                | Snapshot / live field                  | Notes                                                    |
| ----------------------- | -------------------------------------- | -------------------------------------------------------- |
| TVL / supplied          | `tvlUsd` / `suppliedUsd` (+ delta)     | Borrow hero = Σ pool `tvlUsd` in borrow silo only        |
| Available               | `availableUsd` (+ delta)               | Multiply list must use `availableUsd`, not `suppliedUsd` |
| Borrowed                | `borrowedUsd` (+ delta)                | Borrow economy loans use this, not supplied              |
| Utilization             | recomputed from live supplied/borrowed | Prefer live fold over stale tip `utilizationPct`         |
| Supply APY / borrow APR | `supplyApyPct` / `borrowAprPct`        | Lend: IRM must not overwrite snapshot-backed headlines   |
| Max LTV / premium       | `maxLtvPct` / `premiumBps`             | Risk deposit caps resynced from calibrated tip at seed   |
| Detail activity         | sandbox `transactions` by `marketSlug` | Falls back to seeded `walletEvents` if no live rows      |

## Intentional non-SoT (still mock / chrome)

- Venue labels, FAQ copy, about cards
- Wallet balances and position math (wallet write path)
- Chart history shape when series rows are missing
- Homepage `/`: Express Borrow + Swap consumer of **borrow-scoped** snapshots — not a fourth market catalog
- Dashboard: only intentional cross-product join (positions + txs)

## Parity invariants (tested)

1. After hydrate, list row TVL / available / LTV / APY band == detail quick stats for the same slug (borrow / lend / multiply).
2. After tip + supply delta (no EOD), siloed list rows and `getQuickStats` agree.
3. Detail txs prefer sandbox rows when present.

## Deploy note

Seed generator changes (e.g. risk caps) require re-seeding the Convex deployment for already-seeded environments.

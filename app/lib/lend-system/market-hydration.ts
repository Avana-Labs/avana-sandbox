import type { LendSystemState } from "@/app/lib/lend-engine"

/**
 * One lend row from convex/markets.ts `listMarketSnapshots` (scope === "lend").
 * Loose `scope: string` so the raw query result (which also carries asset/pool
 * rows) is assignable without a cast.
 */
export type LendConvexSnapshot = {
  slug: string
  scope: string
  suppliedUsd: number
  borrowedUsd: number
  availableUsd: number
  utilizationPct: number
  supplyApyPct: number
}

/**
 * Fold Convex lend market reference data into a lend system state so the session
 * (list, hero overview, dashboard) reads the SAME numbers as the detail page and
 * the single source of truth. Only market-level supply/liquidity/rate fields are
 * overwritten — wallet positions, balances, and history are left untouched.
 * Returns the SAME state reference when nothing changed so callers can guard
 * re-renders.
 *
 * Convex stores USD; the engine carries token amounts, so we divide by the asset
 * price to recover supplied/borrowed/available token quantities.
 */
export function mergeConvexLendSnapshots(
  state: LendSystemState,
  snapshots: readonly LendConvexSnapshot[],
): LendSystemState {
  if (snapshots.length === 0) return state
  let changed = false
  const markets = { ...state.markets }

  for (const snap of snapshots) {
    if (snap.scope !== "lend") continue
    const existing = markets[snap.slug]
    if (!existing) continue
    const price = existing.assetPriceUsd || 1
    const supplyApy = snap.supplyApyPct / 100
    markets[snap.slug] = {
      ...existing,
      totalSupplied: snap.suppliedUsd / price,
      totalBorrowed: snap.borrowedUsd / price,
      availableLiquidity: snap.availableUsd / price,
      utilization: snap.utilizationPct / 100,
      supplyApy,
      totalApy: supplyApy + existing.rewardsApy,
    }
    changed = true
  }

  return changed ? { ...state, markets } : state
}

import type { MultiplySystemState } from "@/app/lib/multiply-engine"

/**
 * One multiply row from convex/markets.ts `listMarketSnapshots` (scope === "multiply").
 * Loose `scope: string` so the raw query result (which also carries other scopes) is
 * assignable without a cast.
 */
export type MultiplyConvexSnapshot = {
  slug: string
  scope: string
  suppliedUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
}

/**
 * Fold Convex multiply market reference data into a multiply system state so the
 * list/trending read the SAME numbers as the detail page and the single source of
 * truth. Only market-level economics (available liquidity, supply/borrow APY) are
 * overwritten — positions and risk limits are left untouched. Returns the SAME state
 * reference when nothing changed so callers can guard re-renders.
 */
export function mergeConvexMultiplySnapshots(
  state: MultiplySystemState,
  snapshots: readonly MultiplyConvexSnapshot[],
): MultiplySystemState {
  if (snapshots.length === 0) return state
  let changed = false
  const markets = { ...state.markets }

  for (const snap of snapshots) {
    if (snap.scope !== "multiply") continue
    const existing = markets[snap.slug]
    if (!existing) continue
    const availableLiquidityUsd = snap.suppliedUsd
    const supplyApy = snap.supplyApyPct / 100
    const borrowApy = snap.borrowAprPct / 100
    const e = existing.economics
    // Skip when nothing changed (see borrow/lend hydration): avoids allocating a new state
    // object on every re-emit and re-firing the page-live async reads across all clients.
    if (e.availableLiquidityUsd === availableLiquidityUsd && e.supplyApy === supplyApy && e.borrowApy === borrowApy) {
      continue
    }
    markets[snap.slug] = {
      ...existing,
      economics: { ...existing.economics, availableLiquidityUsd, supplyApy, borrowApy },
    }
    changed = true
  }

  return changed ? { ...state, markets } : state
}

import { mergeAliasedQuickStats } from "./live-detail-helpers"

/**
 * Single source of truth for the per-product quick-stat alias maps + the merge used to
 * overlay Convex `getQuickStats` onto a detail's base quick stats. Used BOTH by the
 * server detail builders (initial render) and by the client `QuickStatsGrid` live variant
 * (re-applying fresh values from the live `getQuickStats` subscription over the already-
 * merged base). Client-safe (no `server-only`), so both sides import from here.
 *
 * `getQuickStats` emits canonical ids (supplied/borrowed/available/utilization/supplyApy/
 * borrowApy/reserveFactor); the maps translate those onto each product's mock stat ids.
 */
export type QuickStatsProduct = "borrow" | "lend" | "multiply"

export const QUICK_STAT_ALIASES: Record<QuickStatsProduct, Record<string, string[]>> = {
  // Borrow covers both pool and asset scopes (shared map).
  borrow: {
    supplied: ["supplied", "totalSupplied"],
    borrowed: ["borrowed", "totalBorrowed"],
    utilization: ["utilization"],
    supplyApy: ["supplyApy", "apr"],
    borrowApy: ["borrowApy"],
    available: ["available"],
  },
  lend: {
    supplyApy: ["supplyApy"],
    borrowApy: ["borrowApy"],
  },
  multiply: {
    supplyApy: ["supplyApy"],
    borrowApy: ["borrowApy"],
  },
}

type LiveQuickStat = { id: string; value: string; delta?: unknown }

/**
 * Overlay live `getQuickStats` values onto the (already fully-merged) base quick stats,
 * using the product's alias map. Price/rewards/risk-derived stats — which `getQuickStats`
 * doesn't emit — are left untouched. Returns `base` unchanged when `live` is empty/null.
 */
export function mergeLiveQuickStats<T extends { id: string; value: string; delta?: unknown }>(
  base: T[],
  live: ReadonlyArray<LiveQuickStat> | null | undefined,
  product: QuickStatsProduct,
): T[] {
  return mergeAliasedQuickStats(base, live ?? null, QUICK_STAT_ALIASES[product])
}

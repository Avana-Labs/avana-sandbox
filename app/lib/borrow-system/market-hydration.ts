import { parseFixed, type BorrowSystemState } from "@/app/lib/credit-engine"

/** One row from convex/markets.ts `listMarketSnapshots`. */
export type ConvexMarketSnapshot = {
  slug: string
  scope: "asset" | "pool"
  suppliedUsd: number
  borrowedUsd: number
  availableUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
  tvlUsd: number
  volumeUsd: number
  feesUsd: number
}

function usd6(value: number) {
  return parseFixed(Math.max(0, value).toFixed(6), 6)
}

function wadFromPct(pct: number) {
  return parseFixed((Math.max(0, pct) / 100).toFixed(18), 18)
}

/**
 * Fold Convex market reference data into a borrow system state so the session
 * (list, previews, health factor) reads the SAME numbers as the hero/detail.
 * Only market-level liquidity/rate fields are overwritten — wallet positions,
 * LP token price, shares, and risk config are left untouched. Returns the SAME
 * state reference when nothing changed so callers can guard re-renders.
 *
 * Keying: pool snapshots → state.markets[slug]; asset snapshots → state.assets[slug]
 * (slug = pool id / spoke-scoped asset id, matching the catalog ids).
 */
export function mergeConvexMarketSnapshots(
  state: BorrowSystemState,
  snapshots: readonly ConvexMarketSnapshot[],
): BorrowSystemState {
  if (snapshots.length === 0) return state
  let changed = false
  const markets = { ...state.markets }
  const assets = { ...state.assets }

  for (const snap of snapshots) {
    if (snap.scope === "pool") {
      const market = markets[snap.slug]
      if (!market) continue
      markets[snap.slug] = {
        ...market,
        snapshot: {
          ...market.snapshot,
          totalLiquidityUsd6: usd6(snap.tvlUsd),
          totalBorrowedUsd6: usd6(snap.borrowedUsd),
          availableUsd6: usd6(snap.availableUsd),
          volume24hUsd6: usd6(snap.volumeUsd),
          fees24hUsd6: usd6(snap.feesUsd),
          feeApyWad: wadFromPct(snap.borrowAprPct),
        },
      }
      changed = true
    } else {
      const asset = assets[snap.slug]
      if (!asset) continue
      assets[snap.slug] = {
        ...asset,
        borrowConfig: { ...asset.borrowConfig, baseBorrowAprWad: wadFromPct(snap.borrowAprPct) },
        snapshot: {
          ...asset.snapshot,
          availableLiquidityUsd6: usd6(snap.availableUsd),
          totalBorrowedUsd6: usd6(snap.borrowedUsd),
          totalDebtSharesUsd6: usd6(snap.borrowedUsd),
        },
      }
      changed = true
    }
  }

  return changed ? { ...state, markets, assets } : state
}

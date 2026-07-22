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
      const nextSnapshot = {
        ...market.snapshot,
        totalLiquidityUsd6: usd6(snap.tvlUsd),
        totalBorrowedUsd6: usd6(snap.borrowedUsd),
        availableUsd6: usd6(snap.availableUsd),
        volume24hUsd6: usd6(snap.volumeUsd),
        fees24hUsd6: usd6(snap.feesUsd),
        feeApyWad: wadFromPct(snap.supplyApyPct),
      }
      const s = market.snapshot
      // Only rebuild when a value actually differs. Every emit re-sends every market, so an
      // unconditional `changed = true` allocated a fresh state object on each push — re-firing
      // every page-live async readAdapter on 10k clients even when nothing moved.
      if (
        s.totalLiquidityUsd6 === nextSnapshot.totalLiquidityUsd6 &&
        s.totalBorrowedUsd6 === nextSnapshot.totalBorrowedUsd6 &&
        s.availableUsd6 === nextSnapshot.availableUsd6 &&
        s.volume24hUsd6 === nextSnapshot.volume24hUsd6 &&
        s.fees24hUsd6 === nextSnapshot.fees24hUsd6 &&
        s.feeApyWad === nextSnapshot.feeApyWad
      ) {
        continue
      }
      markets[snap.slug] = { ...market, snapshot: nextSnapshot }
      changed = true
    } else {
      const asset = assets[snap.slug]
      if (!asset) continue
      const availableLiquidityUsd6 = usd6(snap.availableUsd)
      const totalBorrowedUsd6 = usd6(snap.borrowedUsd)
      const baseBorrowAprWad = wadFromPct(snap.borrowAprPct)
      const a = asset.snapshot
      if (
        asset.borrowConfig.baseBorrowAprWad === baseBorrowAprWad &&
        a.availableLiquidityUsd6 === availableLiquidityUsd6 &&
        a.totalBorrowedUsd6 === totalBorrowedUsd6 &&
        a.totalDebtSharesUsd6 === totalBorrowedUsd6
      ) {
        continue
      }
      assets[snap.slug] = {
        ...asset,
        borrowConfig: { ...asset.borrowConfig, baseBorrowAprWad },
        snapshot: {
          ...asset.snapshot,
          availableLiquidityUsd6,
          totalBorrowedUsd6,
          totalDebtSharesUsd6: totalBorrowedUsd6,
        },
      }
      changed = true
    }
  }

  return changed ? { ...state, markets, assets } : state
}

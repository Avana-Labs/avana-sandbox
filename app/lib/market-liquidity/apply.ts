import type { MarketLiquidityDelta } from "@/app/lib/convex/market-liquidity-provider"

/**
 * Single source of truth for layering shared-ledger liquidity deltas onto the
 * static catalog base. Every borrow surface (list, hero, asset/pool detail) reads
 * through these helpers so the same market shows the same numbers everywhere, and
 * those numbers move together as borrow/repay/supply/withdraw activity is recorded
 * (see `useMarketLiquidity`).
 *
 * Keying convention:
 *   - borrowable-asset liquidity → keyed by ASSET id  (borrowedDeltaUsd)
 *   - pool / market supplied TVL  → keyed by MARKET id (suppliedDeltaUsd)
 */

export type DeltaMap = Map<string, MarketLiquidityDelta>

type BorrowableLiquidity = {
  totalBorrowedUsd: number
  availableUsd: number
  utilization: number
}

/**
 * Apply the borrowed delta for a borrowable asset: borrowing moves USD from
 * available → borrowed (repaying does the reverse). Total liquidity (the sum) is
 * conserved, so utilization is recomputed from the moved amounts.
 */
export function applyBorrowableAssetLiquidity<T extends BorrowableLiquidity>(asset: T, delta?: MarketLiquidityDelta): T {
  if (!delta || delta.borrowedDeltaUsd === 0) return asset
  const totalLiquidityUsd = asset.totalBorrowedUsd + asset.availableUsd
  const totalBorrowedUsd = Math.max(0, asset.totalBorrowedUsd + delta.borrowedDeltaUsd)
  const availableUsd = Math.max(0, asset.availableUsd - delta.borrowedDeltaUsd)
  const utilization = totalLiquidityUsd > 0 ? (totalBorrowedUsd / totalLiquidityUsd) * 100 : asset.utilization
  return { ...asset, totalBorrowedUsd, availableUsd, utilization }
}

/** Convenience: look the delta up by the asset's own id, then apply it. */
export function applyBorrowableAssetDelta<T extends BorrowableLiquidity & { id: string }>(asset: T, deltas: DeltaMap): T {
  return applyBorrowableAssetLiquidity(asset, deltas.get(asset.id))
}

/** Signed change to an asset's available-to-borrow liquidity (0 when none / unknown). */
export function borrowedAvailabilityDeltaUsd(deltas: DeltaMap, assetId: string): number {
  const borrowed = deltas.get(assetId)?.borrowedDeltaUsd ?? 0
  return borrowed === 0 ? 0 : -borrowed
}

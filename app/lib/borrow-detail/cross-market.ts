/**
 * Cross-market reference lists for borrow detail pages.
 *
 * Pool (collateral market) → assets you can borrow against it.
 * Asset (borrowable) → collateral markets that unlock borrowing it.
 * Both are spoke-scoped via the registry so every market gets the right peers.
 */

import { BORROW_POOL_CATALOG, type BorrowAssetVisual, type BorrowPoolRow } from "@/app/lib/borrow-sim"
import { listSpokeBorrowables, type SpokeBorrowableRecord } from "@/app/lib/borrow-system/registry"
import { borrowAssetDetailPath, borrowMarketDetailPath } from "@/app/lib/borrow-routes"

export type BorrowableAssetRef = {
  id: string
  name: string
  symbol: string
  visual: BorrowAssetVisual
  /** Borrow APY percent (e.g. 4.2). */
  apy: number
  href: string
}

export type CollateralMarketRef = {
  id: string
  name: string
  venue: string
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  /** Max LTV / collateral factor as a percent (e.g. 78). */
  collateralFactorPct: number
  href: string
}

/** Borrowable assets unlocked by a specific collateral market. */
export function resolveBorrowablesForPool(pool: Pick<BorrowPoolRow, "id" | "spoke">): BorrowableAssetRef[] {
  return listSpokeBorrowables()
    .filter((asset) => asset.spokeId === pool.spoke && asset.marketIds.includes(pool.id))
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      visual: asset.visual,
      apy: asset.borrowApr,
      href: borrowAssetDetailPath(asset.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Collateral markets that can be used to borrow a specific asset. */
export function resolveCollateralForAsset(
  asset: Pick<SpokeBorrowableRecord, "id" | "marketIds">,
  pools: BorrowPoolRow[] = BORROW_POOL_CATALOG,
): CollateralMarketRef[] {
  return pools
    .filter((pool) => asset.marketIds.includes(pool.id))
    .map((pool) => ({
      id: pool.id,
      name: pool.name,
      venue: pool.venue,
      visuals: pool.visuals,
      collateralFactorPct: pool.ltv,
      href: borrowMarketDetailPath(pool.id),
    }))
    .sort((a, b) => b.collateralFactorPct - a.collateralFactorPct || a.name.localeCompare(b.name))
}

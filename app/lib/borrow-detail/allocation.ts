/**
 * Shared helpers that compute cross-cutting facts used by both detail pages:
 * - risk premium bucketing (keeps the pools-table column consistent with the
 *   detail page risk card)
 * - allocation breakdown: for a given asset id, where is it deployed across
 *   the pool catalog?
 * - formatters that wrap the existing ones in borrow-sim.ts
 */

import {
  BORROW_POOL_CATALOG,
  type BorrowAssetVisual,
  type BorrowPoolRow,
  getDexById,
  getSpokeById,
} from "@/app/lib/borrow-sim"
import type { SpokeBorrowableRecord } from "@/app/lib/borrow-system/registry"
import type { AllocationRow, RiskLevel } from "./types"

/**
 * Maps a risk premium (bps) to a qualitative bucket. The bounds are kept in
 * one place so the table pill, the detail gauge, and the breakdown card never
 * disagree. Numbers are inclusive on the lower bound.
 */
export function riskLevelFromBps(bps: number): RiskLevel {
  if (bps < 40) return "low"
  if (bps < 100) return "moderate"
  if (bps < 180) return "elevated"
  return "high"
}

/** Human label for the risk bucket. */
export function riskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case "low":
      return "Low"
    case "moderate":
      return "Moderate"
    case "elevated":
      return "Elevated"
    case "high":
      return "High"
  }
}

/**
 * Gauge score (0..100). Clamped so visual designers can trust the bounds.
 * 25 bps → ~12, 90 bps → ~45, 180 bps → ~70, 300+ bps → ~92.
 */
export function riskScoreFromBps(bps: number): number {
  const mapped = 100 * (1 - Math.exp(-bps / 160))
  return Math.round(Math.max(2, Math.min(98, mapped)))
}

/**
 * Allocation row that still carries its source `pool`. This is the shared core
 * used by both the UI builder (`computeAssetAllocation`) and the Convex seed
 * (`build-seed.ts`), which needs the pool's catalog id (slug) to key the
 * `assetPoolAllocationDaily` rows. Keeping one computation means the seeded
 * allocation is identical to the procedural fallback.
 */
export type AssetAllocationRow = {
  pool: BorrowPoolRow
  sharePct: number
  valueUsd: number
  utilizationPct: number
  borrowAprPct: number
}

/**
 * Finds the pools that expose a given borrowable asset and computes each pool's
 * share-of-asset-TVL, utilization, and apr. The produced percentages always sum
 * to 100 (the top-N rows are re-scaled so rounding drift doesn't leave the UI
 * showing 99.7%).
 */
export function computeAssetAllocationRows(
  asset: SpokeBorrowableRecord,
  pools: BorrowPoolRow[] = BORROW_POOL_CATALOG,
  limit = 6,
): AssetAllocationRow[] {
  const candidates = pools.filter((pool) => asset.marketIds.includes(pool.id))
  if (candidates.length === 0) return []

  const weighted = candidates.map((pool) => {
    const spoke = getSpokeById(pool.spoke)
    const apr = (pool.aprMin + pool.aprMax) / 2
    const utilization = Math.round(spoke.maxLtv * 0.92 + ((apr * 2) % 18))
    return {
      pool,
      weight: pool.availableUsd,
      utilization,
      apr,
    }
  })

  weighted.sort((a, b) => b.weight - a.weight)
  const top = weighted.slice(0, limit)
  const totalWeight = top.reduce((sum, row) => sum + row.weight, 0) || 1
  const rows: AssetAllocationRow[] = top.map(({ pool, weight, utilization, apr }) => {
    const sharePct = (weight / totalWeight) * 100
    const valueUsd = (asset.totalBorrowedUsd + asset.availableUsd) * (weight / totalWeight)
    return {
      pool,
      sharePct: Math.round(sharePct * 100) / 100,
      valueUsd: Math.round(valueUsd),
      utilizationPct: Math.min(99, Math.max(10, utilization)),
      borrowAprPct: Math.round(apr * 100) / 100,
    }
  })

  const sumShare = rows.reduce((sum, row) => sum + row.sharePct, 0)
  if (sumShare !== 0) {
    const scale = 100 / sumShare
    for (const row of rows) {
      row.sharePct = Math.round(row.sharePct * scale * 100) / 100
    }
  }
  return rows
}

/** Venue label for an allocation pool (dex label, falling back to the venue string). */
export function allocationVenueLabel(pool: BorrowPoolRow): string {
  const dex = getDexById(pool.dexes[0]?.id as Parameters<typeof getDexById>[0])
  return dex?.label ?? pool.venue
}

/**
 * Maps the shared rows into the UI's `AllocationRow[]` (hydrating `visuals` +
 * display labels). Identical output to the original procedural builder.
 */
export function computeAssetAllocation(
  asset: SpokeBorrowableRecord,
  pools: BorrowPoolRow[] = BORROW_POOL_CATALOG,
  limit = 6,
): AllocationRow[] {
  return computeAssetAllocationRows(asset, pools, limit).map(({ pool, sharePct, valueUsd, utilizationPct, borrowAprPct }) => {
    const visuals: [BorrowAssetVisual, BorrowAssetVisual] = pool.visuals
    return {
      id: `${asset.id}-${pool.id}`,
      poolName: pool.name,
      venueLabel: allocationVenueLabel(pool),
      visuals,
      sharePct,
      valueUsd,
      utilizationPct,
      borrowAprPct,
    }
  })
}

// -------------------------------------------------------------------------
// Compact formatters (wrap borrow-sim helpers with extra cases)
// -------------------------------------------------------------------------

/** Compact percentage label with fixed digits (e.g. "68.4%"). */
export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(digits)}%`
}

/** Compact bps label (e.g. "+0.80%"). */
export function formatBpsAsPct(bps: number): string {
  return `${bps >= 0 ? "+" : ""}${(bps / 100).toFixed(2)}%`
}

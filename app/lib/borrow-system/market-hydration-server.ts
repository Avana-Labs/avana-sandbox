import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { allocationVenueLabel } from "@/app/lib/borrow-detail/allocation"
import type { AllocationRow } from "@/app/lib/borrow-detail/types"

function convexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    return new ConvexHttpClient(url)
  } catch {
    return null
  }
}

/**
 * Server-side fetch of the Convex market reference snapshots. Returns [] when no
 * deployment is configured or it's unreachable, so callers degrade to the catalog
 * base and the page always renders.
 */
export async function fetchConvexMarketSnapshots(): Promise<ConvexMarketSnapshot[]> {
  const client = convexClient()
  if (!client) return []
  try {
    return (await client.query(api.markets.listBorrowMarketSnapshots, {})) as ConvexMarketSnapshot[]
  } catch {
    return []
  }
}

export type ConvexSeriesPoint = { t: string; v: number }

/**
 * Row shape emitted by api.contractAddresses.list{Pool,Asset,Multiply}Addresses —
 * mapped 1:1 into AboutCard.stats. `label`/`href` are seeded so the display path stays
 * a dumb pass-through; `isSynthetic` is metadata for the seed sync and unused in UI.
 */
export type ConvexContractAddressRow = {
  salt: string
  address: string
  label: string
  href: string
  chain: string
  isSynthetic: boolean
}

async function fetchContractAddressRows(
  runQuery: (client: ConvexHttpClient) => Promise<unknown>,
): Promise<ConvexContractAddressRow[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const rows = (await runQuery(client)) as ConvexContractAddressRow[] | null
    return rows ?? []
  } catch {
    return []
  }
}

/** Pool contract-address rows for detail.about.stats. Empty when Convex is unreachable. */
export async function fetchPoolContractAddresses(poolSlug: string): Promise<ConvexContractAddressRow[]> {
  return fetchContractAddressRows((client) => client.query(api.contractAddresses.listPoolAddresses, { poolSlug }))
}

/** Asset contract-address rows for detail.about.stats. */
export async function fetchAssetContractAddresses(assetSlug: string): Promise<ConvexContractAddressRow[]> {
  return fetchContractAddressRows((client) => client.query(api.contractAddresses.listAssetAddresses, { assetSlug }))
}

/** Multiply-market contract-address rows for detail.about.stats. */
export async function fetchMultiplyContractAddresses(marketSlug: string): Promise<ConvexContractAddressRow[]> {
  return fetchContractAddressRows((client) => client.query(api.contractAddresses.listMultiplyAddresses, { marketSlug }))
}

/** Pool hero series = TVL (total supplied) over the full window. */
export async function fetchPoolTvlSeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getPoolHeroSeries, { slug, metric: "tvl", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Pool hero borrowed series over the full window. */
export async function fetchPoolBorrowedSeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getPoolHeroSeries, { slug, metric: "borrowed", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Pool hero utilization series over the full window. */
export async function fetchPoolUtilizationSeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getPoolHeroSeries, { slug, metric: "utilization", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Asset hero series = total borrows over the full window. */
export async function fetchAssetBorrowSeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getAssetHeroSeries, { slug, metric: "borrow", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Cashflow breakdown card (rows + monthly bars) from seeded revenue. */
export async function fetchCashflowBreakdown(scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return scope === "pool"
      ? await client.query(api.borrow.cashflow.getBreakdownForPool, { slug })
      : await client.query(api.borrow.cashflow.getBreakdownForAsset, { slug })
  } catch {
    return null
  }
}

/** Asset monthly revenue trend (gross interest paid by borrowers). */
export async function fetchAssetCashflowTrend(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.cashflow.getRevenueForAsset, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (sandbox first, seeded walletEvents fallback). */
export async function fetchRecentTransactions(scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getRecentTransactions, { scope, slug })
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/**
 * Asset allocation breakdown (per-pool split) from `assetPoolAllocationDaily`.
 * The Convex query returns the numeric split + `poolSlug`; we hydrate token
 * `visuals` + the venue label from the catalog here (icons are a client concern),
 * matching the procedural `computeAssetAllocation` output shape exactly.
 */
export async function fetchAllocation(slug: string): Promise<AllocationRow[] | null> {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.allocation.getForAsset, { slug })
    if (!rows || rows.length === 0) return null
    const out: AllocationRow[] = []
    for (const row of rows) {
      const pool = BORROW_POOL_CATALOG.find((p) => p.id === row.poolSlug)
      if (!pool) continue
      out.push({
        id: `${slug}-${row.poolSlug}`,
        poolName: row.poolName,
        venueLabel: allocationVenueLabel(pool),
        visuals: pool.visuals,
        sharePct: row.sharePct,
        valueUsd: row.valueUsd,
        utilizationPct: row.utilizationPct,
        borrowAprPct: row.borrowAprPct,
      })
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

/** Latest risk assessment (premium + breakdown + metrics) for a pool or asset. */
/** Latest risk assessment (Risk Premium card) from product-siloed `borrowRiskAssessments`. */
export async function fetchRisk(_scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.riskAssessment.getRisk, { slug })
  } catch {
    return null
  }
}

/**
 * Calibrated Market-overview quick stats (supplied/borrowed/utilization/APY) for a
 * pool or asset, from the Convex daily rows. The detail builder merges these over
 * the mock quick stats so the headline numbers match the hero + the page aggregate
 * (and aren't the curated-fixture values). Returns null when unreachable/unseeded.
 */
export async function fetchQuickStats(scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getQuickStats, { scope, slug })
    return rows && rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Asset SupplyBorrowCard series from Convex daily tips (null when unseeded). */
export async function fetchSupplyBorrow(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.markets.getSupplyBorrow, { slug })
  } catch {
    return null
  }
}

/** Asset historical utilization series from Convex (null when unseeded). */
export async function fetchHistoricalUtilization(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.markets.getHistoricalUtilization, { slug })
  } catch {
    return null
  }
}

/** Editorial content (About description/stats/history + FAQs) for a pool or asset. */
/** Editorial content (About / FAQs / history) from product-siloed `borrowMarketContent`. */
export async function fetchContent(_scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.content.getContent, { slug })
  } catch {
    return null
  }
}

/** Borrow product Risk Parameters grid (pool/asset). Product-siloed table. */
export async function fetchBorrowRiskParameters(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.riskParameters.getRiskParameters, { slug })
  } catch {
    return null
  }
}

/** Borrow product — Assets You Can Borrow edges for a pool. */
export async function fetchBorrowPoolBorrowables(poolSlug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.borrow.poolBorrowables.getPoolBorrowables, { poolSlug })
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Borrow product — Interest Rate Model for an asset. */
export async function fetchBorrowInterestRateModel(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.interestRateModel.getInterestRateModel, { slug })
  } catch {
    return null
  }
}

/** Borrow product — Liquidation Risk KPIs for a pool. */
export async function fetchBorrowLiquidationRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.liquidationRisk.getLiquidationRisk, { slug })
  } catch {
    return null
  }
}

/** Borrow product — siloed market identity (pool or asset). */
export async function fetchBorrowMarket(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.borrow.markets.getMarket, { slug })
  } catch {
    return null
  }
}

/** Real token prices (base symbol → USD) from the Convex oracle (DefiLlama). */
export async function fetchTokenPrices(): Promise<Record<string, number> | null> {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.prices.getPrices, {})
    if (!rows || rows.length === 0) return null
    const map: Record<string, number> = {}
    for (const r of rows) map[r.symbol.toLowerCase()] = r.priceUsd
    return map
  } catch {
    return null
  }
}

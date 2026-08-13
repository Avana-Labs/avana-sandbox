import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { type ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
import type { MultiplyConvexSnapshot } from "@/app/lib/multiply-system/market-hydration"

/**
 * Server-side Convex fetchers for the multiply (leveraged loop) detail page + list.
 * Mirrors the borrow/lend hydration servers, scoped to `"multiply"`. Every fetcher
 * degrades to `null`/`[]` when no Convex deployment is configured or it's unreachable,
 * so the page always renders off the catalog/mock fallback.
 */

export type { ConvexContractAddressRow, ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
export { fetchMultiplyContractAddresses, fetchTokenPrices } from "@/app/lib/borrow-system/market-hydration-server"

/** Latest-day reference snapshot for a single multiply market. */
export type MultiplyMarketSnapshot = {
  slug: string
  suppliedUsd: number
  availableUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
}

function convexClient(): ConvexHttpClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    return new ConvexHttpClient(url)
  } catch {
    return null
  }
}

/** Latest-day reference snapshot for one multiply market (from `listMarketSnapshots`). */
export async function fetchMultiplyMarketSnapshot(slug: string): Promise<MultiplyMarketSnapshot | null> {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.listMultiplyMarketSnapshots, {})
    const match = rows.find((row) => row.slug === slug)
    if (!match) return null
    return {
      slug: match.slug,
      suppliedUsd: match.suppliedUsd,
      availableUsd: match.availableUsd,
      utilizationPct: match.utilizationPct,
      supplyApyPct: match.supplyApyPct,
      borrowAprPct: match.borrowAprPct,
    }
  } catch {
    return null
  }
}

/** All multiply-scope latest-day snapshots (for SSR list hydration). [] when unreachable. */
export async function fetchMultiplyMarketSnapshots(): Promise<MultiplyConvexSnapshot[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const rows = await client.query(api.markets.listMultiplyMarketSnapshots, {})
    return rows.map((row) => ({
      slug: row.slug,
      scope: row.scope,
      name: row.name,
      symbol: row.symbol,
      maxLtvPct: row.maxLtvPct,
      suppliedUsd: row.suppliedUsd,
      borrowedUsd: row.borrowedUsd,
      availableUsd: row.availableUsd,
      utilizationPct: row.utilizationPct,
      supplyApyPct: row.supplyApyPct,
      borrowAprPct: row.borrowAprPct,
    }))
  } catch {
    return []
  }
}

/** Multiply hero series = total value locked (supplied) over the full window. */
export async function fetchMultiplySupplySeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getMultiplyHeroSeries, { slug, metric: "supply", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Cashflow breakdown card (rows + monthly bars) for a multiply market. */
export async function fetchMultiplyCashflowBreakdown(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.cashflow.getBreakdown, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (sandbox first, seeded walletEvents fallback). */
export async function fetchMultiplyRecentTransactions(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getRecentTransactions, { scope: "multiply", slug })
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Latest risk assessment (premium + breakdown + metrics) for a multiply market. */
/** Latest risk assessment (Risk Premium card) from product-siloed `multiplyRiskAssessments`. */
export async function fetchMultiplyRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.riskAssessment.getRisk, { slug })
  } catch {
    return null
  }
}

/** Calibrated Market-overview quick stats for a multiply market. Null when unseeded. */
export async function fetchMultiplyQuickStats(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getQuickStats, { scope: "multiply", slug })
    return rows && rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Editorial content (About description/stats/history + FAQs) for a multiply market. */
export async function fetchMultiplyContent(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.content.getContent, { slug })
  } catch {
    return null
  }
}

/** Multiply product — Risk Parameters for About / Risk Parameters grid. */
export async function fetchMultiplyRiskParameters(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.riskParameters.getRiskParameters, { slug })
  } catch {
    return null
  }
}

/** Multiply product — Liquidation Risk KPIs. */
export async function fetchMultiplyLiquidationRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.liquidationRisk.getLiquidationRisk, { slug })
  } catch {
    return null
  }
}

/** Multiply product — siloed market identity. */
export async function fetchMultiplyMarket(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.markets.getMarket, { slug })
  } catch {
    return null
  }
}

/** Multiply product — Interest Rate Model params for the IRM curve card. */
export async function fetchMultiplyInterestRateModel(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.multiply.interestRateModel.getInterestRateModel, { slug })
  } catch {
    return null
  }
}

/** Multiply product — per-market allocation across contributing pools. */
export async function fetchMultiplyAllocation(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.multiply.allocation.getAllocation, { slug })
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Multiply supply/borrow/utilization series (Convex daily rows, "1Y" window). */
export async function fetchMultiplySupplyBorrow(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.markets.getMultiplySupplyBorrow, { slug })
  } catch {
    return null
  }
}

/** Multiply historical utilization series (Convex daily rows, "1Y" window). */
export async function fetchMultiplyHistoricalUtilization(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.markets.getMultiplyHistoricalUtilization, { slug })
  } catch {
    return null
  }
}

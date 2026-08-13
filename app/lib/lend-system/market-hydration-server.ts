import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { type ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
import type { LendConvexSnapshot } from "@/app/lib/lend-system/market-hydration"

/**
 * Server-side Convex fetchers for the lend (single-asset supply) detail page.
 * Mirrors `borrow-system/market-hydration-server.ts` but scoped to `"lend"`.
 * Every fetcher degrades to `null`/`[]` when no Convex deployment is configured
 * or it's unreachable, so the page always renders off the catalog/mock fallback.
 */

export type { ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
export { fetchTokenPrices } from "@/app/lib/borrow-system/market-hydration-server"

/** Latest-day reference snapshot for a single lend market. */
export type LendMarketSnapshot = {
  slug: string
  suppliedUsd: number
  borrowedUsd: number
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

/** All lend-scope latest-day snapshots (for SSR list hydration). [] when unreachable. */
export async function fetchLendMarketSnapshots(): Promise<LendConvexSnapshot[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const rows = await client.query(api.markets.listLendMarketSnapshots, {})
    return rows.map((row) => ({
      slug: row.slug,
      scope: row.scope,
      name: row.name,
      symbol: row.symbol,
      reserveFactorPct: row.reserveFactorPct,
      rewardsApyPct: row.rewardsApyPct,
      suppliedUsd: row.suppliedUsd,
      borrowedUsd: row.borrowedUsd,
      availableUsd: row.availableUsd,
      utilizationPct: row.utilizationPct,
      supplyApyPct: row.supplyApyPct,
    }))
  } catch {
    return []
  }
}

/** Latest-day reference snapshot for one lend market (from `listMarketSnapshots`). */
export async function fetchLendMarketSnapshot(slug: string): Promise<LendMarketSnapshot | null> {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.listLendMarketSnapshots, {})
    const match = rows.find((row) => row.slug === slug)
    if (!match) return null
    return {
      slug: match.slug,
      suppliedUsd: match.suppliedUsd,
      borrowedUsd: match.borrowedUsd,
      availableUsd: match.availableUsd,
      utilizationPct: match.utilizationPct,
      supplyApyPct: match.supplyApyPct,
      borrowAprPct: match.borrowAprPct,
    }
  } catch {
    return null
  }
}

/** Lend hero series = total supplied over the full window. */
export async function fetchLendSupplySeries(slug: string): Promise<ConvexSeriesPoint[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const res = await client.query(api.markets.getLendHeroSeries, { slug, metric: "supply", range: "ALL" })
    return (res?.points ?? []) as ConvexSeriesPoint[]
  } catch {
    return []
  }
}

/** Cashflow breakdown card (rows + monthly bars) for a lend market. */
export async function fetchLendCashflowBreakdown(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.cashflow.getBreakdown, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (sandbox first, seeded walletEvents fallback). */
export async function fetchLendRecentTransactions(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getRecentTransactions, { scope: "lend", slug })
    return rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Latest risk assessment (premium + breakdown + metrics) for a lend market. */
/** Latest risk assessment (Risk Premium card) from product-siloed `lendRiskAssessments`. */
export async function fetchLendRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.riskAssessment.getRisk, { slug })
  } catch {
    return null
  }
}

/** Calibrated Market-overview quick stats for a lend market. Null when unseeded. */
export async function fetchLendQuickStats(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    const rows = await client.query(api.markets.getQuickStats, { scope: "lend", slug })
    return rows && rows.length > 0 ? rows : null
  } catch {
    return null
  }
}

/** Editorial content (About description/stats/history + FAQs) for a lend market. */
export async function fetchLendContent(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.content.getContent, { slug })
  } catch {
    return null
  }
}

/** Lend product — Risk Parameters for About / Risk Parameters grid. */
export async function fetchLendRiskParameters(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.riskParameters.getRiskParameters, { slug })
  } catch {
    return null
  }
}

/** Lend product — Interest Rate Model curve params + live util/APR. */
export async function fetchLendInterestRateModel(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.interestRateModel.getInterestRateModel, { slug })
  } catch {
    return null
  }
}

/** Lend product — siloed market identity. */
export async function fetchLendMarket(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.lend.markets.getMarket, { slug })
  } catch {
    return null
  }
}

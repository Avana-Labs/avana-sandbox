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
    const rows = await client.query(api.markets.listMarketSnapshots, {})
    return rows
      .filter((row) => row.scope === "lend")
      .map((row) => ({
        slug: row.slug,
        scope: row.scope,
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
    const rows = await client.query(api.markets.listMarketSnapshots, {})
    const match = rows.find((row) => row.scope === "lend" && row.slug === slug)
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

/** User engagement trend (active wallets + supply retention) for a lend market. */
export async function fetchLendEngagement(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.engagement.getForLend, { slug })
  } catch {
    return null
  }
}

/** Cashflow breakdown card (rows + monthly bars) for a lend market. */
export async function fetchLendCashflowBreakdown(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.cashflow.getBreakdownForLend, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (from walletEvents) for the lend history card. */
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
export async function fetchLendRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.risk.getRisk, { scope: "lend", slug })
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
    return await client.query(api.content.getContent, { scope: "lend", slug })
  } catch {
    return null
  }
}

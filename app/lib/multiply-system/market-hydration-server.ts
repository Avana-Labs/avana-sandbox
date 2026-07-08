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

export type { ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
export { fetchTokenPrices } from "@/app/lib/borrow-system/market-hydration-server"

/** Latest-day reference snapshot for a single multiply market. */
export type MultiplyMarketSnapshot = {
  slug: string
  suppliedUsd: number
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
    const rows = await client.query(api.markets.listMarketSnapshots, {})
    const match = rows.find((row) => row.scope === "multiply" && row.slug === slug)
    if (!match) return null
    return {
      slug: match.slug,
      suppliedUsd: match.suppliedUsd,
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
    const rows = await client.query(api.markets.listMarketSnapshots, {})
    return rows
      .filter((row) => row.scope === "multiply")
      .map((row) => ({
        slug: row.slug,
        scope: row.scope,
        suppliedUsd: row.suppliedUsd,
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
    return await client.query(api.cashflow.getBreakdownForMultiply, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (from walletEvents) for the multiply history card. */
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
export async function fetchMultiplyRisk(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.risk.getRisk, { scope: "multiply", slug })
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
    return await client.query(api.content.getContent, { scope: "multiply", slug })
  } catch {
    return null
  }
}

import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"

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
    return (await client.query(api.markets.listMarketSnapshots, {})) as ConvexMarketSnapshot[]
  } catch {
    return []
  }
}

export type ConvexSeriesPoint = { t: string; v: number }

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

/** User engagement trend (active wallets/sessions) for a pool or asset. */
export async function fetchEngagement(scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return scope === "pool"
      ? await client.query(api.engagement.getForPool, { slug })
      : await client.query(api.engagement.getForAsset, { slug })
  } catch {
    return null
  }
}

/** Cashflow breakdown card (rows + monthly bars) from seeded revenue. */
export async function fetchCashflowBreakdown(scope: "pool" | "asset", slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return scope === "pool"
      ? await client.query(api.cashflow.getBreakdownForPool, { slug })
      : await client.query(api.cashflow.getBreakdownForAsset, { slug })
  } catch {
    return null
  }
}

/** Asset monthly revenue trend (gross interest paid by borrowers). */
export async function fetchAssetCashflowTrend(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.cashflow.getRevenueForAsset, { slug })
  } catch {
    return null
  }
}

/** Recent market transactions (from walletEvents) for the history card. */
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

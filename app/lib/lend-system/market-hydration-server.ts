import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import type { LendConvexSnapshot } from "@/app/lib/lend-system/market-hydration"
import { requestCache } from "@/app/lib/detail-page/request-cache"
import { isUsableConvexPrice } from "@/app/lib/prices/validated-convex-price"

/**
 * Server-side Convex fetchers for the lend detail page. Every fetcher degrades to `null`/`[]`
 * when Convex is unconfigured or unreachable, so the page renders off the catalog fallback.
 */

export type { ConvexSeriesPoint } from "@/app/lib/borrow-system/market-hydration-server"
export { fetchTokenPrices } from "@/app/lib/borrow-system/market-hydration-server"

/** Latest-day reference snapshot for a single lend market. */
type LendMarketSnapshot = {
  slug: string
  suppliedUsd: number
  borrowedUsd: number
  availableUsd: number
  utilizationPct: number
  supplyApyPct: number
  borrowAprPct: number
}

// One client per request (request-scoped via React.cache); a fresh client per call in the
// non-RSC test runtime.
const convexClient = requestCache((): ConvexHttpClient | null => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    return new ConvexHttpClient(url)
  } catch {
    return null
  }
})

/** All lend-scope latest-day snapshots (for SSR list hydration). [] when unreachable. */
export async function fetchLendMarketSnapshots(): Promise<LendConvexSnapshot[]> {
  const client = convexClient()
  if (!client) return []
  try {
    const [rows, priceSnapshot] = await Promise.all([
      client.query(api.markets.listLendMarketSnapshots, {}),
      client.query(api.prices.getPriceSnapshot, {}),
    ])
    const priceBySymbol = new Map(
      priceSnapshot.prices
        .filter((row) => isUsableConvexPrice(row, Date.now(), priceSnapshot.status.invalidAfterMs))
        .map((row) => [row.symbol.trim().toLowerCase(), row] as const),
    )
    return rows.map((row) => {
      const price = priceBySymbol.get(row.symbol.trim().toLowerCase())
      return {
        slug: row.slug,
        scope: row.scope,
        name: row.name,
        symbol: row.symbol,
        reserveFactorPct: row.reserveFactorPct,
        rewardsApyPct: row.rewardsApyPct,
        assetPriceUsd: price?.priceUsd,
        priceUpdatedAt: price?.updatedAt,
        suppliedUsd: row.suppliedUsd,
        borrowedUsd: row.borrowedUsd,
        availableUsd: row.availableUsd,
        utilizationPct: row.utilizationPct,
        supplyApyPct: row.supplyApyPct,
      }
    })
  } catch {
    return []
  }
}

/** Latest-day reference snapshot for one lend market (slug-scoped). */
export async function fetchLendMarketSnapshot(slug: string): Promise<LendMarketSnapshot | null> {
  const client = convexClient()
  if (!client) return null
  try {
    const match = await client.query(api.markets.getMarketSnapshot, { scope: "lend", slug })
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

/** Supply/borrow/utilization series for lend hero secondary tabs. */
export async function fetchLendSupplyBorrow(slug: string) {
  const client = convexClient()
  if (!client) return null
  try {
    return await client.query(api.markets.getLendSupplyBorrow, { slug })
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

/** Lend-market contract-address rows for detail.about.stats. */
export async function fetchLendContractAddresses(marketSlug: string) {
  const client = convexClient()
  if (!client) return []
  try {
    const rows = await client.query(api.contractAddresses.listLendAddresses, { marketSlug })
    return rows ?? []
  } catch {
    return []
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

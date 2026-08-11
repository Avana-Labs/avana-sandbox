import "server-only"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import {
  fetchLendCashflowBreakdown,
  fetchLendContent,
  fetchLendMarketSnapshot,
  fetchLendQuickStats,
  fetchLendRecentTransactions,
  fetchLendRisk,
  fetchLendSupplySeries,
  fetchTokenPrices,
} from "@/app/lib/lend-system/market-hydration-server"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import { buildLendMarketDetail, resolveLendMarket } from "./mock"
import type { LendMarketDetail } from "./types"
import type { QuickStat } from "@/app/lib/borrow-detail"

/**
 * Server-only Convex-hydrated lend detail builder. The lend detail page calls this
 * so its numbers come from Convex and match the list/hero:
 *   - reference values (supplied / borrowed / utilization / APY) ← Convex snapshot
 *   - HERO chart (total supplied)                                ← Convex daily series
 *   - engagement / cashflow / risk / about / faqs / transactions ← Convex queries
 *   - real price                                                 ← Convex oracle (DefiLlama)
 * Each Convex read falls back to the catalog/mock value when unreachable, so the
 * page always renders. Kept OUT of `./index.ts` because that barrel is also imported
 * by client components and `market-hydration-server.ts` is `server-only`.
 */

/** Convex `getQuickStats` emits asset-style ids; map each to the mock ids it overrides. */
const QUICK_STAT_ALIASES: Record<string, string[]> = {
  supplied: ["supplied"],
  borrowed: ["borrowed"],
  utilization: ["utilization"],
  supplyApy: ["supplyApy"],
  borrowApy: ["borrowApy"],
}

function mergeConvexQuickStats(
  base: QuickStat[],
  convex: ReadonlyArray<{ id: string; value: string; delta?: QuickStat["delta"] }> | null,
): QuickStat[] {
  return mergeAliasedQuickStats(base, convex, QUICK_STAT_ALIASES)
}

/** Overlay the real DefiLlama price onto the "price" quick stat for a base symbol. */
function injectRealPrice(
  quickStats: QuickStat[],
  prices: Record<string, number> | null,
  baseSymbol: string,
): QuickStat[] {
  if (!prices) return quickStats
  const price = prices[priceKey(baseSymbol)]
  if (price === undefined) return quickStats
  return quickStats.map((s) => (s.id === "price" ? { ...s, value: formatTokenPrice(price) } : s))
}

export async function getLendMarketDetailFromConvex(id: string): Promise<LendMarketDetail | null> {
  const market = resolveLendMarket(id)
  if (!market) return null
  const slug = market.marketId

  const snapshot = await fetchLendMarketSnapshot(slug)
  const detail = buildLendMarketDetail(
    market,
    snapshot
      ? {
          suppliedUsd: snapshot.suppliedUsd,
          borrowedUsd: snapshot.borrowedUsd,
          availableUsd: snapshot.availableUsd,
          utilizationPct: snapshot.utilizationPct,
          supplyApyPct: snapshot.supplyApyPct,
          borrowAprPct: snapshot.borrowAprPct,
        }
      : undefined,
  )

  const [supplyPoints, cashflow, transactions, risk, quickStats, prices, content] = await Promise.all([
    fetchLendSupplySeries(slug),
    fetchLendCashflowBreakdown(slug),
    fetchLendRecentTransactions(slug),
    fetchLendRisk(slug),
    fetchLendQuickStats(slug),
    fetchTokenPrices(),
    fetchLendContent(slug),
  ])

  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, market.asset.symbol),
      heroFeed: buildHeroFeedFromConvexSeries(supplyPoints, "usdCompact") ?? detail.heroFeed,
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
      risk: (risk as typeof detail.risk) ?? detail.risk,
    },
    content,
  )

  return {
    ...hydrated,
    about: {
      ...hydrated.about,
      stats: detail.about.stats,
    },
  }
}

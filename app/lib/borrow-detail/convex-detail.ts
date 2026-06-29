import "server-only"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { mergeConvexMarketSnapshots } from "@/app/lib/borrow-system/market-hydration"
import {
  fetchAllocation,
  fetchAssetBorrowSeries,
  fetchAssetCashflowTrend,
  fetchCashflowBreakdown,
  fetchContent,
  fetchConvexMarketSnapshots,
  fetchEngagement,
  fetchPoolTvlSeries,
  fetchQuickStats,
  fetchRecentTransactions,
  fetchRisk,
  fetchTokenPrices,
} from "@/app/lib/borrow-system/market-hydration-server"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { QuickStat } from "./types"
import { resolveAssetDetailFromState, resolvePoolDetailFromState } from "@/app/lib/borrow-system/read-model"
import { resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { normalizeBorrowAssetRouteId, normalizeBorrowMarketRouteId } from "@/app/lib/borrow-routes"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { AssetDetail, PoolDetail } from "./types"

/**
 * Server-only Convex-hydrated detail builders. The borrow detail pages call these
 * so their numbers come from Convex and match the list/hero:
 *   - reference values (TVL, available, utilization, APY, quick stats) ← Convex snapshot
 *   - HERO chart (pool = TVL / total supplied, asset = total borrows) ← Convex daily series
 *   - engagement (active wallets/sessions) ← Convex walletEvents
 * Each Convex read falls back to the catalog/mock value when unreachable, so the
 * page always renders.
 *
 * Kept OUT of `./index.ts` because that module is also imported by client
 * components, and `market-hydration-server.ts` is `server-only`.
 */
const detailWalletId = getDefaultWalletProfileId()

/**
 * The asset mock uses quick-stat ids supplied/borrowed/supplyApy; the pool mock uses
 * totalSupplied/totalBorrowed/apr for the same concepts. Convex `getQuickStats` emits
 * the asset-style ids, so map each Convex id to every mock id it should override.
 */
const QUICK_STAT_ALIASES: Record<string, string[]> = {
  supplied: ["supplied", "totalSupplied"],
  borrowed: ["borrowed", "totalBorrowed"],
  utilization: ["utilization"],
  supplyApy: ["supplyApy", "apr"],
  borrowApy: ["borrowApy"],
}

/**
 * Overlay the Convex Market-overview quick stats (supplied / borrowed / utilization /
 * APY) onto the mock quick stats, keeping the mock-only stats (price, dex liquidity,
 * risk exposure) untouched. This makes the headline numbers match the hero + the page
 * aggregate instead of the curated-fixture values, for both asset and pool pages.
 */
function mergeConvexQuickStats(
  base: QuickStat[],
  convex: ReadonlyArray<{ id: string; value: string; delta?: QuickStat["delta"] }> | null,
): QuickStat[] {
  if (!convex || convex.length === 0) return base
  const byMockId = new Map<string, { value: string; delta?: QuickStat["delta"] }>()
  for (const c of convex) {
    for (const mockId of QUICK_STAT_ALIASES[c.id] ?? [c.id]) byMockId.set(mockId, c)
  }
  return base.map((s) => {
    const c = byMockId.get(s.id)
    return c ? { ...s, value: c.value, delta: c.delta ?? s.delta } : s
  })
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

/**
 * Overlay "Dex Liquidity" (Σ available liquidity across the asset's pools) from the
 * calibrated Convex pool snapshots, so it matches the rest of the page instead of the
 * inflated catalog sum. No-op if no pool snapshots are present.
 */
function injectDexLiquidity(
  quickStats: QuickStat[],
  snapshots: ConvexMarketSnapshot[],
  poolSlugs: readonly string[],
): QuickStat[] {
  const poolAvailable = new Map(snapshots.filter((s) => s.scope === "pool").map((s) => [s.slug, s.availableUsd]))
  let total = 0
  let matched = false
  for (const slug of poolSlugs) {
    const available = poolAvailable.get(slug)
    if (available !== undefined) {
      total += available
      matched = true
    }
  }
  if (!matched) return quickStats
  return quickStats.map((s) => (s.id === "dexLiquidity" ? { ...s, value: formatCompactUsd(total) } : s))
}

export async function getPoolDetailFromConvex(id: string): Promise<PoolDetail | null> {
  const snapshots = await fetchConvexMarketSnapshots()
  const state = buildMockBorrowSystemState(detailWalletId)
  const hydrated = snapshots.length > 0 ? mergeConvexMarketSnapshots(state, snapshots) : state
  const detail = resolvePoolDetailFromState(hydrated, detailWalletId, normalizeBorrowMarketRouteId(id))
  if (!detail) return null

  const [tvlPoints, engagement, cashflow, transactions, risk, quickStats, content] = await Promise.all([
    fetchPoolTvlSeries(detail.row.id),
    fetchEngagement("pool", detail.row.id),
    fetchCashflowBreakdown("pool", detail.row.id),
    fetchRecentTransactions("pool", detail.row.id),
    fetchRisk("pool", detail.row.id),
    fetchQuickStats("pool", detail.row.id),
    fetchContent("pool", detail.row.id),
  ])
  return {
    ...detail,
    quickStats: mergeConvexQuickStats(detail.quickStats, quickStats),
    heroFeed: buildHeroFeedFromConvexSeries(tvlPoints, "usdCompact") ?? detail.heroFeed,
    engagement: (engagement as typeof detail.engagement) ?? detail.engagement,
    cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
    transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
    risk: (risk as typeof detail.risk) ?? detail.risk,
    about: content ? { ...detail.about, description: content.description, stats: content.stats, history: content.history } : detail.about,
    faqs: content?.faqs ?? detail.faqs,
  }
}

export async function getAssetDetailFromConvex(id: string): Promise<AssetDetail | null> {
  const routeSlug = normalizeBorrowAssetRouteId(id)
  // The route id may be a BASE-asset id ("usdc") or a spoke-scoped id ("uni-v2:usdc").
  // Convex markets are keyed by the spoke-scoped id, so resolve to the canonical
  // record and query Convex by ITS id — otherwise a base id finds no Convex market and
  // the hero/quick-stats fall back to a random mock feed (the "$65K total borrows" bug).
  const record = resolveAsset(routeSlug)
  if (!record) return null
  const slug = record.id

  const snapshots = await fetchConvexMarketSnapshots()
  const snap = snapshots.find((row) => row.scope === "asset" && row.slug === slug)
  const detail = resolveAssetDetailFromState(
    slug,
    snap
      ? {
          availableUsd: snap.availableUsd,
          totalBorrowedUsd: snap.borrowedUsd,
          utilization: snap.utilizationPct,
          borrowApr: snap.borrowAprPct,
        }
      : undefined,
  )
  if (!detail) return null

  const [borrowPoints, engagement, cashflow, cashflowTrend, transactions, allocation, risk, quickStats, prices, content] = await Promise.all([
    fetchAssetBorrowSeries(slug),
    fetchEngagement("asset", slug),
    fetchCashflowBreakdown("asset", slug),
    fetchAssetCashflowTrend(slug),
    fetchRecentTransactions("asset", slug),
    fetchAllocation(slug),
    fetchRisk("asset", slug),
    fetchQuickStats("asset", slug),
    fetchTokenPrices(),
    fetchContent("asset", slug),
  ])
  return {
    ...detail,
    quickStats: injectDexLiquidity(
      injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, record.baseAssetId),
      snapshots,
      record.marketIds,
    ),
    heroFeed: buildHeroFeedFromConvexSeries(borrowPoints, "usdCompact") ?? detail.heroFeed,
    engagement: (engagement as typeof detail.engagement) ?? detail.engagement,
    cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
    cashflowTrend: (cashflowTrend as typeof detail.cashflowTrend) ?? detail.cashflowTrend,
    transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
    allocation: allocation ?? detail.allocation,
    risk: (risk as typeof detail.risk) ?? detail.risk,
    about: content ? { ...detail.about, description: content.description, stats: content.stats, history: content.history } : detail.about,
    faqs: content?.faqs ?? detail.faqs,
  }
}

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
  fetchPoolTvlSeries,
  fetchQuickStats,
  fetchRecentTransactions,
  fetchRisk,
  fetchTokenPrices,
} from "@/app/lib/borrow-system/market-hydration-server"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import { formatOraclePrice } from "@/app/lib/borrow-detail/formatters"
import { formatBpsAsPct } from "@/app/lib/borrow-detail/allocation"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { QuickStat, RelatedPoolSummary } from "./types"
import { resolveAssetDetailFromState, resolvePoolDetailFromState } from "@/app/lib/borrow-system/read-model"
import { resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { normalizeBorrowAssetRouteId, normalizeBorrowMarketRouteId } from "@/app/lib/borrow-routes"
import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import type { AssetDetail, PoolDetail } from "./types"

/**
 * Server-only Convex-hydrated detail builders. The borrow detail pages call these
 * so their numbers come from Convex and match the list/hero:
 *   - reference values (TVL, available, utilization, APY, quick stats) ← Convex snapshot
 *   - HERO chart (pool = TVL / total supplied, asset = total borrows) ← Convex daily series
 *   - engagement (active wallets/sessions) ← Convex walletEvents
 * Each Convex read falls back to the deterministic catalog fixture when
 * unreachable, so the page always renders and the sandbox/demo routes stay
 * stable without pretending the fallback is the live source of truth.
 *
 * Kept OUT of `./index.ts` because that module is also imported by client
 * components, and `market-hydration-server.ts` is `server-only`.
 */
const detailWalletId = getDefaultWalletProfileId()

/**
 * Convex `getQuickStats` emits supplied/borrowed/utilization/supplyApy/borrowApy.
 * Pool pages still use totalSupplied/totalBorrowed/apr; asset pages now follow the
 * lend headline set (available/supplyApy/borrowApy), so unused Convex ids no-op.
 */
const QUICK_STAT_ALIASES: Record<string, string[]> = {
  supplied: ["supplied", "totalSupplied"],
  borrowed: ["borrowed", "totalBorrowed"],
  utilization: ["utilization"],
  supplyApy: ["supplyApy", "apr"],
  borrowApy: ["borrowApy"],
  available: ["available"],
}

/**
 * Overlay Convex Market-overview quick stats onto the mock headline numbers,
 * keeping mock-only stats (price, rewards, reserve factor, risk exposure) intact.
 */
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

/**
 * Overlay the pool "Oracle price" quick stat with the real pair rate derived from the
 * DefiLlama token oracle (price0 / price1), so an asset shows one consistent oracle price
 * across borrow-detail, the lend list, and the multiply catalog. When either leg is
 * unpriced or the oracle is unavailable, the stat is DROPPED rather than left showing the
 * fabricated mock fallback — the display path never surfaces a hardcoded oracle price.
 */
export function injectPoolOraclePrice(
  quickStats: QuickStat[],
  prices: Record<string, number> | null,
  symbol0: string,
  symbol1: string,
): QuickStat[] {
  const p0 = prices?.[priceKey(symbol0)]
  const p1 = prices?.[priceKey(symbol1)]
  if (p0 === undefined || p1 === undefined || p1 === 0) {
    return quickStats.filter((s) => s.id !== "price" && s.id !== "oraclePrice")
  }
  const value = formatOraclePrice(p0 / p1)
  return quickStats.map((s) => (s.id === "price" || s.id === "oraclePrice" ? { ...s, value } : s))
}

/**
 * Restate the "Risk premium" quick stat (Market data > Risk exposure) from the SAME
 * premium the Risk assessment card renders (detail.risk.premiumBps), so a page never
 * shows two different values for the one metric. The mock quick stat comes from the
 * catalog row while risk is overlaid from Convex; without this they can disagree.
 */
export function syncQuickStatsRiskPremium(quickStats: QuickStat[], premiumBps: number): QuickStat[] {
  const value = formatBpsAsPct(premiumBps)
  return quickStats.map((s) => (s.id === "riskPremium" ? { ...s, value } : s))
}

/**
 * Restate each Related-pools card's "Available" from the calibrated Convex pool snapshot
 * for that sibling — the SAME value the sibling shows as "Available to borrow" on its own
 * detail page (both derive from snap.availableUsd via the hydrated market state). Without
 * this the card reuses the raw catalog availableUsd, which diverges 3–7× from the sibling's
 * hydrated figure. Falls back to the existing label when a sibling has no snapshot.
 */
export function syncRelatedAvailable(
  related: RelatedPoolSummary[],
  snapshots: ConvexMarketSnapshot[],
): RelatedPoolSummary[] {
  const poolAvailable = new Map(snapshots.filter((s) => s.scope === "pool").map((s) => [s.slug, s.availableUsd]))
  if (poolAvailable.size === 0) return related
  return related.map((card) => {
    const available = poolAvailable.get(card.id)
    return available === undefined ? card : { ...card, availableLabel: formatCompactUsd(available) }
  })
}

/**
 * Overlay "Available Liquidity" from the Convex asset snapshot (supplied − borrowed).
 * No-op if that snapshot is missing.
 */
function injectAvailableLiquidity(
  quickStats: QuickStat[],
  snapshots: ConvexMarketSnapshot[],
  slug: string,
  scope: "asset" | "pool" = "asset",
): QuickStat[] {
  const snap = snapshots.find((s) => s.scope === scope && s.slug === slug)
  if (!snap) return quickStats
  return quickStats.map((s) => (s.id === "available" ? { ...s, value: formatCompactUsd(snap.availableUsd) } : s))
}

export async function getPoolDetailFromConvex(id: string): Promise<PoolDetail | null> {
  const snapshots = await fetchConvexMarketSnapshots()
  const state = buildMockBorrowSystemState(detailWalletId)
  const hydratedState = snapshots.length > 0 ? mergeConvexMarketSnapshots(state, snapshots) : state
  const detail = resolvePoolDetailFromState(hydratedState, detailWalletId, normalizeBorrowMarketRouteId(id))
  if (!detail) return null

  const [tvlPoints, cashflow, transactions, risk, quickStats, prices, content] = await Promise.all([
    fetchPoolTvlSeries(detail.row.id),
    fetchCashflowBreakdown("pool", detail.row.id),
    fetchRecentTransactions("pool", detail.row.id),
    fetchRisk("pool", detail.row.id),
    fetchQuickStats("pool", detail.row.id),
    fetchTokenPrices(),
    fetchContent("pool", detail.row.id),
  ])
  const effectiveRisk = (risk as typeof detail.risk) ?? detail.risk
  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectAvailableLiquidity(
        injectPoolOraclePrice(
          mergeConvexQuickStats(detail.quickStats, quickStats),
          prices,
          detail.row.visuals[0].symbol,
          detail.row.visuals[1].symbol,
        ),
        snapshots,
        detail.row.id,
        "pool",
      ),
      related: syncRelatedAvailable(detail.related, snapshots),
      heroFeed: buildHeroFeedFromConvexSeries(tvlPoints, "usdCompact") ?? detail.heroFeed,
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
      risk: effectiveRisk,
    },
    content,
  )

  return {
    ...hydrated,
    about: {
      ...hydrated.about,
      description: detail.about.description,
      stats: detail.about.stats,
      governanceParameters: detail.about.governanceParameters,
    },
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

  const [borrowPoints, cashflow, cashflowTrend, transactions, allocation, risk, quickStats, prices, content] =
    await Promise.all([
      fetchAssetBorrowSeries(slug),
      fetchCashflowBreakdown("asset", slug),
      fetchAssetCashflowTrend(slug),
      fetchRecentTransactions("asset", slug),
      fetchAllocation(slug),
      fetchRisk("asset", slug),
      fetchQuickStats("asset", slug),
      fetchTokenPrices(),
      fetchContent("asset", slug),
    ])
  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectAvailableLiquidity(
        injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, record.baseAssetId),
        snapshots,
        slug,
      ),
      heroFeed: buildHeroFeedFromConvexSeries(borrowPoints, "usdCompact") ?? detail.heroFeed,
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      cashflowTrend: (cashflowTrend as typeof detail.cashflowTrend) ?? detail.cashflowTrend,
      transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
      allocation: allocation ?? detail.allocation,
      risk: (risk as typeof detail.risk) ?? detail.risk,
    },
    content,
  )

  return {
    ...hydrated,
    about: {
      ...hydrated.about,
      description: detail.about.description,
      stats: detail.about.stats,
      governanceParameters: detail.about.governanceParameters,
    },
  }
}

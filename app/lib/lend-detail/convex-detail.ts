import "server-only"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import {
  fetchLendCashflowBreakdown,
  fetchLendContent,
  fetchLendInterestRateModel,
  fetchLendMarket,
  fetchLendMarketSnapshot,
  fetchLendQuickStats,
  fetchLendRecentTransactions,
  fetchLendRisk,
  fetchLendRiskParameters,
  fetchLendSupplySeries,
  fetchTokenPrices,
} from "@/app/lib/lend-system/market-hydration-server"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import {
  injectSiloedMarketQuickStats,
  overlayAboutDescription,
  overlayHeroIdentity,
} from "@/app/lib/detail-page/siloed-market-overlay"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { shouldFailClosedInLive } from "@/app/lib/detail-page/live-fallback"
import { resolveLendHeadlineRates } from "./headline-rates"
import type { ProtocolParameterRow } from "@/app/lib/borrow-detail/protocol-parameters"
import { buildLendMarketDetail, resolveLendMarket } from "./mock"
import type { LendMarketDetail } from "./types"
import type { QuickStat } from "@/app/lib/borrow-detail"

/**
 * Server-only Convex-hydrated lend detail builder. The lend detail page calls this
 * so its numbers come from Convex and match the list/hero:
 *   - reference values (supplied / borrowed / utilization / APY) ← Convex snapshot
 *   - HERO chart (total supplied)                                ← Convex daily series
 *   - engagement / cashflow / risk / about / faqs / transactions ← Convex queries
 *   - risk parameters / IRM                                      ← lend* product silos
 *   - real price                                                 ← Convex oracle (DefiLlama)
 * Each Convex read falls back to the catalog/mock value when unreachable, so the
 * page always renders. Kept OUT of `./index.ts` because that barrel is also imported
 * by client components and `market-hydration-server.ts` is `server-only`.
 */

/** Convex `getQuickStats` emits asset-style ids; map each to the mock ids it overrides. */
const QUICK_STAT_ALIASES: Record<string, string[]> = {
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

function formatPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`
}

function irmProtocolParameters(irm: {
  optimalUtilizationPct: number
  slopeBelowOptimalPct: number
  slopeAboveOptimalPct: number
  baseBorrowRatePct: number
}): ProtocolParameterRow[] {
  return [
    { id: "optimalUtilization", label: "Optimal utilization", value: formatPct(irm.optimalUtilizationPct) },
    { id: "slopeBelowOptimal", label: "Slope below optimal", value: formatPct(irm.slopeBelowOptimalPct) },
    { id: "slopeAboveOptimal", label: "Slope above optimal", value: formatPct(irm.slopeAboveOptimalPct) },
    { id: "baseBorrowRate", label: "Base borrow rate", value: formatPct(irm.baseBorrowRatePct) },
  ]
}

function applyRiskParametersToAbout(
  detail: LendMarketDetail,
  riskParameters: Awaited<ReturnType<typeof fetchLendRiskParameters>>,
): LendMarketDetail {
  if (!riskParameters?.parameters.length) return detail
  return {
    ...detail,
    about: {
      ...detail.about,
      governanceParameters: {
        parameters: riskParameters.parameters.map((parameter) => ({
          id: parameter.id,
          label: parameter.label,
          value: parameter.value,
          description: parameter.description,
        })),
        changelog: detail.about.governanceParameters?.changelog ?? [],
      },
    },
  }
}

export async function getLendMarketDetailFromConvex(id: string): Promise<LendMarketDetail | null> {
  const market = resolveLendMarket(id)
  if (!market) return null
  const slug = market.marketId

  const snapshot = await fetchLendMarketSnapshot(slug)
  // Fail closed in live mode when Convex has no snapshot — matches borrow detail
  // so the page never silently renders the mock catalog next to an empty live list.
  if (shouldFailClosedInLive(resolveDataSourceMode(), snapshot != null)) return null
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

  const [
    supplyPoints,
    cashflow,
    transactions,
    risk,
    quickStats,
    prices,
    content,
    riskParameters,
    interestRateModel,
    siloedMarket,
  ] = await Promise.all([
    fetchLendSupplySeries(slug),
    fetchLendCashflowBreakdown(slug),
    fetchLendRecentTransactions(slug),
    fetchLendRisk(slug),
    fetchLendQuickStats(slug),
    fetchTokenPrices(),
    fetchLendContent(slug),
    fetchLendRiskParameters(slug),
    fetchLendInterestRateModel(slug),
    fetchLendMarket(slug),
  ])

  const headline = resolveLendHeadlineRates({
    snapshotBacked: Boolean(snapshot),
    detailUtilizationPct: detail.utilizationPct,
    detailBorrowAprPct: detail.borrowAprPct,
    irmUtilizationPct: interestRateModel?.utilizationPct,
    irmBorrowAprPct: interestRateModel?.borrowAprPct,
  })

  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectSiloedMarketQuickStats(
        injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, market.asset.symbol),
        siloedMarket,
      ),
      heroFeed: buildHeroFeedFromConvexSeries(supplyPoints, "usdCompact") ?? detail.heroFeed,
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      transactions: (transactions as typeof detail.transactions) ?? detail.transactions,
      risk: (risk as typeof detail.risk) ?? detail.risk,
      utilizationPct: headline.utilizationPct,
      borrowAprPct: headline.borrowAprPct,
      protocolParameters: interestRateModel ? irmProtocolParameters(interestRateModel) : detail.protocolParameters,
    },
    content,
    { clearWhenMissing: resolveDataSourceMode() === "live" },
  )

  return applyRiskParametersToAbout(
    {
      ...hydrated,
      hero: overlayHeroIdentity(hydrated.hero, siloedMarket),
      about: overlayAboutDescription(hydrated.about, siloedMarket),
    },
    riskParameters,
  )
}

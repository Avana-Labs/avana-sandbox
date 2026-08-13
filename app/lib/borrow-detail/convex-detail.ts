import "server-only"
import { requestCache as cache } from "@/app/lib/detail-page/request-cache"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { mergeConvexMarketSnapshots } from "@/app/lib/borrow-system/market-hydration"
import {
  fetchAllocation,
  fetchAssetBorrowSeries,
  fetchAssetSuppliedSeries,
  fetchAssetUtilizationSeries,
  fetchAssetCashflowTrend,
  fetchAssetContractAddresses,
  fetchBorrowInterestRateModel,
  fetchBorrowLiquidationRisk,
  fetchBorrowMarket,
  fetchBorrowPoolBorrowables,
  fetchBorrowRiskParameters,
  fetchBorrowRiskParametersForSlugs,
  fetchCashflowBreakdown,
  fetchContent,
  fetchConvexMarketSnapshots,
  fetchHistoricalUtilization,
  fetchPoolContractAddresses,
  fetchQuickStats,
  fetchRecentTransactions,
  fetchRisk,
  fetchSupplyBorrow,
  fetchTokenPrices,
  type ConvexContractAddressRow,
} from "@/app/lib/borrow-system/market-hydration-server"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import { formatOraclePrice } from "@/app/lib/borrow-detail/formatters"
import { formatBpsAsPct } from "@/app/lib/borrow-detail/allocation"
import { resolveAssetDetailFromState, resolvePoolDetailFromState } from "@/app/lib/borrow-system/read-model"
import { resolveAsset } from "@/app/lib/borrow-detail/asset.mock"
import {
  borrowAssetDetailPath,
  normalizeBorrowAssetRouteId,
  normalizeBorrowMarketRouteId,
} from "@/app/lib/borrow-routes"
import type { BorrowableAssetRef } from "@/app/lib/borrow-detail/cross-market"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import { buildHeroFeedFromConvexSeries } from "@/app/lib/chart-feeds"
import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import { buildMockLiquidationRiskStats } from "@/app/lib/detail-page/liquidation-risk"
import { injectSiloedMarketQuickStats, overlayHeroIdentity } from "@/app/lib/detail-page/siloed-market-overlay"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { shouldFailClosedWithoutSnapshots } from "@/app/lib/borrow-detail/live-fallback"
import type { AllocationRow, AssetDetail, PoolDetail, QuickStat } from "./types"

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
 * Fail-closed empty defaults used when a Convex query returns null. These stand in for
 * the removed nullish-mock cascades — the mock's shape survives (so UI type contracts
 * hold) but none of its VALUES leak into the hydrated detail. Each shape is the minimal
 * that makes the corresponding UI section render empty (no rows, no bars).
 */
const EMPTY_CASHFLOW_CARD: import("./types").CashflowCard = { bars: [], rows: [], periodLabel: "" }
const EMPTY_RISK_ASSESSMENT: import("./types").RiskAssessment = {
  premiumBps: 0,
  level: "low",
  score: 0,
  headline: "",
  summary: "",
  breakdown: [],
  metrics: [],
}
const EMPTY_CASHFLOW_TREND: import("./types").CashflowTrend = {
  totalLabel: "",
  periodLabel: "",
  series: { id: "cashflow-trend", label: "", points: [] },
}
const EMPTY_SERIES = { id: "empty", label: "", points: [] }
const EMPTY_SUPPLY_BORROW = {
  supplied: { id: "supplied", label: "Supplied", points: [] },
  borrowed: { id: "borrowed", label: "Borrowed", points: [] },
  utilization: { id: "utilization", label: "Utilization", points: [] },
}

function mapConvexBorrowables(
  rows: ReadonlyArray<{ id: string; name: string; symbol: string; borrowAprPct: number }> | null,
): BorrowableAssetRef[] | undefined {
  if (!rows || rows.length === 0) return undefined
  const byId = new Map(listSpokeBorrowables().map((asset) => [asset.id, asset]))
  return rows.map((row) => {
    const asset = byId.get(row.id)
    return {
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      visual: asset?.visual ?? {
        symbol: row.symbol,
        shortLabel: row.symbol.slice(0, 1),
        bgClass: "bg-muted",
        textClass: "text-foreground",
      },
      apy: row.borrowAprPct,
      href: borrowAssetDetailPath(row.id),
    }
  })
}

function collateralFactorFromRiskParameters(
  parameters: ReadonlyArray<{ id: string; value: string }> | null | undefined,
): number | undefined {
  const raw = parameters?.find((parameter) => parameter.id === "collateralFactor")?.value
  if (!raw) return undefined
  const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : undefined
}

async function enrichAllocationWithCollateralFactors(
  allocation: AllocationRow[] | null,
  assetId: string,
): Promise<AllocationRow[] | null> {
  if (!allocation || allocation.length === 0) return allocation
  const poolSlugs = [
    ...new Set(
      allocation.map((row) => {
        const prefix = `${assetId}-`
        return row.id.startsWith(prefix) ? row.id.slice(prefix.length) : row.id
      }),
    ),
  ]
  const riskRows = await fetchBorrowRiskParametersForSlugs(poolSlugs)
  const cfByPool = new Map<string, number>()
  for (const row of riskRows ?? []) {
    const cf = collateralFactorFromRiskParameters(row.parameters)
    if (cf !== undefined) cfByPool.set(row.slug, cf)
  }
  if (cfByPool.size === 0) return allocation
  return allocation.map((row) => {
    const prefix = `${assetId}-`
    const poolSlug = row.id.startsWith(prefix) ? row.id.slice(prefix.length) : row.id
    const collateralFactorPct = cfByPool.get(poolSlug)
    return collateralFactorPct === undefined ? row : { ...row, collateralFactorPct }
  })
}

/**
 * Contract-address rows for the About card. Maps the Convex row's label/address/href
 * into AboutCard.stats — the display-friendly `Vault Contract Address` / `Token …` /
 * `Staking …` (+ `Governance …` on pools) labels come from the seed (`salt` → label
 * spelled out in contract-addresses-seed.ts) so the client stays a pass-through.
 */
const CONTRACT_ADDRESS_LABEL_BY_SALT: Record<string, string> = {
  vault: "Vault Contract Address",
  token: "Token Contract Address",
  staking: "Staking Contract Address",
}

/** Only these three addresses show on About (matches the pre-migration 3-row spec — no Governance). */
const CONTRACT_ADDRESS_SALTS = new Set(["vault", "token", "staking"])

/** True for any stat that is a contract-address row (used to strip stale/duplicate ones). */
function isContractAddressStat(stat: { label: string }): boolean {
  return /Contract Address$/.test(stat.label)
}

function contractRowToStat(row: ConvexContractAddressRow): { label: string; value: string; href: string } {
  return {
    label: CONTRACT_ADDRESS_LABEL_BY_SALT[row.salt] ?? row.label,
    value: row.label,
    href: row.href,
  }
}

/**
 * Replace (not append) the About card's contract-address rows with the canonical
 * Vault/Token/Staking set from Convex. Stripping any pre-existing contract rows first
 * makes this idempotent against stale/double-seeded `content.stats` (deployments seeded
 * before the mock stopped emitting these), so the card always shows exactly three —
 * never the 6–7 duplicates the old append produced. When Convex has no rows (offline),
 * leave the seeded stats untouched so the card still renders.
 */
function injectContractAddressStats<T extends { about: AssetDetail["about"] | PoolDetail["about"] }>(
  detail: T,
  rows: readonly ConvexContractAddressRow[],
): T {
  const contractRows = rows.filter((row) => CONTRACT_ADDRESS_SALTS.has(row.salt))
  if (contractRows.length === 0) return detail
  const seen = new Set<string>()
  const contractStats: Array<{ label: string; value: string; href: string }> = []
  for (const stat of contractRows.map(contractRowToStat)) {
    if (seen.has(stat.label)) continue
    seen.add(stat.label)
    contractStats.push(stat)
  }
  return {
    ...detail,
    about: {
      ...detail.about,
      stats: [...detail.about.stats.filter((stat) => !isContractAddressStat(stat)), ...contractStats],
    },
  }
}

function applyRiskParametersToAbout<T extends { about: AssetDetail["about"] | PoolDetail["about"] }>(
  detail: T,
  riskParameters: Awaited<ReturnType<typeof fetchBorrowRiskParameters>>,
): T {
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

async function getPoolDetailFromConvexUncached(id: string): Promise<PoolDetail | null> {
  const snapshots = await fetchConvexMarketSnapshots()
  if (shouldFailClosedWithoutSnapshots(resolveDataSourceMode(), snapshots.length)) return null
  const state = buildMockBorrowSystemState(detailWalletId)
  const hydratedState = snapshots.length > 0 ? mergeConvexMarketSnapshots(state, snapshots) : state
  const detail = resolvePoolDetailFromState(hydratedState, detailWalletId, normalizeBorrowMarketRouteId(id))
  if (!detail) return null

  // Hero series are no longer fetched here — the page preloads them via preloadPoolHero
  // (convex/nextjs preloadQuery) and hands the tokens to the live hero, so the series is
  // fetched exactly once and the client hydrates from it instead of re-fetching.
  const [
    cashflow,
    transactions,
    risk,
    quickStats,
    prices,
    content,
    riskParameters,
    poolBorrowables,
    liquidationRisk,
    siloedMarket,
    contractAddresses,
  ] = await Promise.all([
    fetchCashflowBreakdown("pool", detail.row.id),
    fetchRecentTransactions("pool", detail.row.id),
    fetchRisk("pool", detail.row.id),
    fetchQuickStats("pool", detail.row.id),
    fetchTokenPrices(),
    fetchContent("pool", detail.row.id),
    fetchBorrowRiskParameters(detail.row.id),
    fetchBorrowPoolBorrowables(detail.row.id),
    fetchBorrowLiquidationRisk(detail.row.id),
    fetchBorrowMarket(detail.row.id),
    fetchPoolContractAddresses(detail.row.id),
  ])
  // Capacity labels are now sourced solely from borrowRiskParameters (Convex-seeded
  // via borrowPoolCapacityLabels at seed time). Read-time overlay removed — it re-applied
  // the same 1.75×/2.25× heuristic on top of the already-seeded value, silently masking
  // any real cap change and giving devs two things to keep in sync.
  //
  // getQuickStats already emits `available` and `reserveFactor` directly, so the two
  // per-stat overlays that used to layer them on top of the Convex quickStats have been
  // deleted. premiumBps flows from Convex risk when present, else 0 (fail-closed).
  const convexRisk = (risk as typeof detail.risk | null) ?? null
  const mergedQuickStats = syncQuickStatsRiskPremium(
    injectSiloedMarketQuickStats(
      injectPoolOraclePrice(
        mergeConvexQuickStats(detail.quickStats, quickStats),
        prices,
        detail.row.visuals[0].symbol,
        detail.row.visuals[1].symbol,
      ),
      siloedMarket,
    ),
    convexRisk?.premiumBps ?? 0,
  )
  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: mergedQuickStats,
      // heroFeed / heroBorrowedFeed / heroUtilizationFeed are set by the page from the
      // preloaded hero series (preloadPoolHero), not built here.
      cashflow: (cashflow as typeof detail.cashflow | null) ?? EMPTY_CASHFLOW_CARD,
      transactions: (transactions as typeof detail.transactions | null) ?? [],
      risk: convexRisk ?? EMPTY_RISK_ASSESSMENT,
      borrowableAssets: mapConvexBorrowables(poolBorrowables),
      liquidationRisk: liquidationRisk?.stats?.length
        ? liquidationRisk.stats
        : (detail.liquidationRisk ?? buildMockLiquidationRiskStats(detail.row.id)),
    },
    content,
    { clearWhenMissing: resolveDataSourceMode() === "live" },
  )

  const withIdentity = injectContractAddressStats(
    {
      ...hydrated,
      hero: overlayHeroIdentity(hydrated.hero, siloedMarket),
    },
    contractAddresses,
  )

  if (!riskParameters?.parameters.length) return withIdentity
  return applyRiskParametersToAbout(withIdentity, riskParameters)
}

async function getAssetDetailFromConvexUncached(id: string): Promise<AssetDetail | null> {
  const routeSlug = normalizeBorrowAssetRouteId(id)
  // The route id may be a BASE-asset id ("usdc") or a spoke-scoped id ("uni-v2:usdc").
  // Convex markets are keyed by the spoke-scoped id, so resolve to the canonical
  // record and query Convex by ITS id — otherwise a base id finds no Convex market and
  // the hero/quick-stats fall back to a random mock feed (the "$65K total borrows" bug).
  const record = resolveAsset(routeSlug)
  if (!record) return null
  const slug = record.id

  const snapshots = await fetchConvexMarketSnapshots()
  if (shouldFailClosedWithoutSnapshots(resolveDataSourceMode(), snapshots.length)) return null
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

  const [
    suppliedPoints,
    borrowPoints,
    utilizationPoints,
    supplyBorrow,
    historicalUtilization,
    cashflow,
    cashflowTrend,
    transactions,
    allocation,
    risk,
    quickStats,
    prices,
    content,
    riskParameters,
    interestRateModel,
    siloedMarket,
    contractAddresses,
  ] = await Promise.all([
    fetchAssetSuppliedSeries(slug),
    fetchAssetBorrowSeries(slug),
    fetchAssetUtilizationSeries(slug),
    fetchSupplyBorrow(slug),
    fetchHistoricalUtilization(slug),
    fetchCashflowBreakdown("asset", slug),
    fetchAssetCashflowTrend(slug),
    fetchRecentTransactions("asset", slug),
    fetchAllocation(slug),
    fetchRisk("asset", slug),
    fetchQuickStats("asset", slug),
    fetchTokenPrices(),
    fetchContent("asset", slug),
    fetchBorrowRiskParameters(slug),
    fetchBorrowInterestRateModel(slug),
    fetchBorrowMarket(slug),
    fetchAssetContractAddresses(slug),
  ])

  const allocationWithCf = await enrichAllocationWithCollateralFactors(allocation, slug)

  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectSiloedMarketQuickStats(
        injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, record.baseAssetId),
        siloedMarket,
      ),
      heroFeed: buildHeroFeedFromConvexSeries(suppliedPoints, "usdCompact") ?? undefined,
      heroBorrowedFeed: buildHeroFeedFromConvexSeries(borrowPoints, "usdCompact") ?? undefined,
      heroUtilizationFeed: buildHeroFeedFromConvexSeries(utilizationPoints, "percent") ?? undefined,
      supplyBorrow: (supplyBorrow as typeof detail.supplyBorrow | null) ?? EMPTY_SUPPLY_BORROW,
      historicalUtilization: (historicalUtilization as typeof detail.historicalUtilization | null) ?? EMPTY_SERIES,
      cashflow: (cashflow as typeof detail.cashflow | null) ?? EMPTY_CASHFLOW_CARD,
      cashflowTrend: (cashflowTrend as typeof detail.cashflowTrend | null) ?? EMPTY_CASHFLOW_TREND,
      transactions: (transactions as typeof detail.transactions | null) ?? [],
      allocation: (allocationWithCf as typeof detail.allocation | null) ?? [],
      risk: (risk as typeof detail.risk | null) ?? EMPTY_RISK_ASSESSMENT,
      interestRateModel: interestRateModel
        ? {
            utilizationPct: interestRateModel.utilizationPct,
            borrowAprPct: interestRateModel.borrowAprPct,
            optimalUtilizationPct: interestRateModel.optimalUtilizationPct,
            slopeBelowOptimalPct: interestRateModel.slopeBelowOptimalPct,
            slopeAboveOptimalPct: interestRateModel.slopeAboveOptimalPct,
            baseBorrowRatePct: interestRateModel.baseBorrowRatePct,
          }
        : undefined,
    },
    content,
    { clearWhenMissing: resolveDataSourceMode() === "live" },
  )

  return applyRiskParametersToAbout(
    injectContractAddressStats(
      {
        ...hydrated,
        hero: overlayHeroIdentity(hydrated.hero, siloedMarket),
      },
      contractAddresses,
    ),
    riskParameters,
  )
}

// Request-scoped memoization: `generateMetadata` and the page body both call these
// builders per request. Without cache() each detail render runs the full Convex
// fan-out twice. React.cache() dedups by argument for the lifetime of the request.
export const getPoolDetailFromConvex = cache(getPoolDetailFromConvexUncached)
export const getAssetDetailFromConvex = cache(getAssetDetailFromConvexUncached)

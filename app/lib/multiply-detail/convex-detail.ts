import "server-only"
import { requestCache as cache } from "@/app/lib/detail-page/request-cache"
import {
  fetchMultiplyCashflowBreakdown,
  fetchMultiplyContent,
  fetchMultiplyContractAddresses,
  fetchMultiplyLiquidationRisk,
  fetchMultiplyMarket,
  fetchMultiplyMarketSnapshot,
  fetchMultiplyQuickStats,
  fetchMultiplyRecentTransactions,
  fetchMultiplyRisk,
  fetchMultiplyRiskParameters,
  fetchMultiplySupplyBorrow,
  fetchTokenPrices,
  type ConvexContractAddressRow,
} from "@/app/lib/multiply-system/market-hydration-server"
import { formatTokenPrice, priceKey } from "@/app/lib/prices/format"
import { applyDetailContentOverlay, mergeAliasedQuickStats } from "@/app/lib/detail-page/live-detail-helpers"
import { QUICK_STAT_ALIASES } from "@/app/lib/detail-page/live-quick-stats"
import { buildMockLiquidationRiskStats } from "@/app/lib/detail-page/liquidation-risk"
import {
  injectAvailableUsdQuickStat,
  injectSiloedMarketQuickStats,
  overlayHeroIdentity,
} from "@/app/lib/detail-page/siloed-market-overlay"
import { resolveDataSourceMode } from "@/app/lib/data/providers/source-mode"
import { shouldFailClosedInLive } from "@/app/lib/detail-page/live-fallback"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { getMultiplyMarketDetail } from "./index"
import type { MultiplyMarketDetail, MultiplyTxHistoryRow } from "./index"
import type { QuickStat } from "@/app/lib/borrow-detail"

/**
 * Server-only Convex-hydrated multiply detail builder. Overlays seeded/live data onto
 * the deterministic mock detail so the page's numbers come from Convex and match the
 * list/hero:
 *   - HERO chart (TVL)                      ← Convex daily series
 *   - quick stats (available / APYs)        ← Convex snapshot
 *   - cashflow / risk / content            ← Convex queries
 *   - risk parameters / liquidation risk   ← multiply* product silos
 *   - transactions                         ← global walletEvents for this market
 * Each Convex read falls back to the mock value when unreachable, so the page always
 * renders.
 */

/** Map the generic walletEvents kinds onto the multiply history row kinds. */
const MULTIPLY_TX_KIND: Record<string, MultiplyTxHistoryRow["kind"]> = {
  supply: "add",
  borrow: "add",
  withdraw: "reduce",
  repay: "reduce",
  liquidation: "close",
  rewards: "interest",
}

function mapConvexTransactions(
  rows: ReadonlyArray<{
    id: string
    at: string
    kind: string
    amountLabel: string
    walletLabel?: string
    counterpartyLabel?: string
    txHashShort: string
  }> | null,
): MultiplyTxHistoryRow[] | null {
  if (!rows || rows.length === 0) return null
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    kind: MULTIPLY_TX_KIND[r.kind] ?? "rebalance",
    amountLabel: r.amountLabel,
    counterpartyLabel: r.counterpartyLabel,
    walletLabel: r.walletLabel,
    txHashShort: r.txHashShort,
  }))
}

/** Convex `getQuickStats` emits asset-style ids; map each to the lend-style mock ids. */
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

function mergeConvexQuickStats(
  base: QuickStat[],
  convex: ReadonlyArray<{ id: string; value: string; delta?: QuickStat["delta"] }> | null,
): QuickStat[] {
  return mergeAliasedQuickStats(base, convex, QUICK_STAT_ALIASES.multiply)
}

function applyRiskParametersToAbout(
  detail: MultiplyMarketDetail,
  riskParameters: Awaited<ReturnType<typeof fetchMultiplyRiskParameters>>,
): MultiplyMarketDetail {
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

/**
 * Same three salts as the pool/asset overlays (vault/token/staking), keyed by `salt`
 * so the display label stays derived from the Convex row's classification, not
 * hardcoded here in the detail path.
 */
const MULTIPLY_CONTRACT_LABEL_BY_SALT: Record<string, string> = {
  vault: "Vault Contract Address",
  token: "Token Contract Address",
  staking: "Staking Contract Address",
}

const MULTIPLY_CONTRACT_SALTS = new Set(["vault", "token", "staking"])

/**
 * Replace (not append) the About card's contract-address rows with the canonical three
 * from Convex. Multiply seeded these into BOTH `content.stats` and the contract-address
 * table, so the old append produced exact duplicates (6 rows). Stripping existing
 * contract rows first makes it idempotent — always exactly three, stale-seed-proof.
 */
function injectMultiplyContractAddressStats(
  detail: MultiplyMarketDetail,
  rows: readonly ConvexContractAddressRow[],
): MultiplyMarketDetail {
  const contractRows = rows.filter((row) => MULTIPLY_CONTRACT_SALTS.has(row.salt))
  if (contractRows.length === 0) return detail
  const seen = new Set<string>()
  const contractStats: Array<{ label: string; value: string; href: string }> = []
  for (const row of contractRows) {
    const label = MULTIPLY_CONTRACT_LABEL_BY_SALT[row.salt] ?? row.label
    if (seen.has(label)) continue
    seen.add(label)
    contractStats.push({ label, value: row.label, href: row.href })
  }
  return {
    ...detail,
    about: {
      ...detail.about,
      stats: [...detail.about.stats.filter((stat) => !/Contract Address$/.test(stat.label)), ...contractStats],
    },
  }
}

async function getMultiplyMarketDetailFromConvexUncached(id: string): Promise<MultiplyMarketDetail | null> {
  const detail = getMultiplyMarketDetail(id)
  if (!detail) return null
  const slug = detail.id

  // Supply hero series preloaded by the page (preloadMultiplyHero) — not fetched here.
  const [
    cashflow,
    transactions,
    risk,
    quickStats,
    prices,
    content,
    riskParameters,
    liquidationRisk,
    siloedMarket,
    snapshot,
    supplyBorrow,
    contractAddresses,
  ] = await Promise.all([
    fetchMultiplyCashflowBreakdown(slug),
    fetchMultiplyRecentTransactions(slug),
    fetchMultiplyRisk(slug),
    fetchMultiplyQuickStats(slug),
    fetchTokenPrices(),
    fetchMultiplyContent(slug),
    fetchMultiplyRiskParameters(slug),
    fetchMultiplyLiquidationRisk(slug),

    fetchMultiplyMarket(slug),
    fetchMultiplyMarketSnapshot(slug),
    fetchMultiplySupplyBorrow(slug),
    fetchMultiplyContractAddresses(slug),
  ])
  // Fail closed in live mode when Convex has no snapshot — matches borrow detail
  // so the page never silently renders the mock catalog next to an empty live list.
  if (shouldFailClosedInLive(resolveDataSourceMode(), snapshot != null)) return null

  const hydrated = applyDetailContentOverlay(
    {
      ...detail,
      quickStats: injectSiloedMarketQuickStats(
        injectAvailableUsdQuickStat(
          injectRealPrice(mergeConvexQuickStats(detail.quickStats, quickStats), prices, detail.row.protocol),
          snapshot?.availableUsd,
          formatCompactUsd,
        ),
        siloedMarket,
      ),
      // heroFeed set by the page from preloadMultiplyHero.
      cashflow: (cashflow as typeof detail.cashflow) ?? detail.cashflow,
      transactions: mapConvexTransactions(transactions) ?? detail.transactions,
      risk: (risk as typeof detail.risk) ?? detail.risk,
      liquidationRisk: liquidationRisk?.stats?.length
        ? liquidationRisk.stats
        : (detail.liquidationRisk ?? buildMockLiquidationRiskStats(slug)),
      // Fail closed: when Convex has no rows the section stays empty rather than
      // reusing the PRNG mock in `detail.supplyBorrow`. Empty series render as no
      // points and the hero chart falls back to its own downstream local feed.
      supplyBorrow: supplyBorrow ?? buildEmptySupplyBorrow(slug),
    },
    content,
    { clearWhenMissing: resolveDataSourceMode() === "live" },
  )

  return applyRiskParametersToAbout(
    injectMultiplyContractAddressStats(
      {
        ...hydrated,
        hero: overlayHeroIdentity(hydrated.hero, siloedMarket),
      },
      contractAddresses,
    ),
    riskParameters,
  )
}

/**
 * Empty supply/borrow/utilization triple used when the Convex query returns null.
 * The page's fail-closed contract: the section stays empty (no points) rather than
 * reusing the mock PRNG series from `getMultiplyMarketDetail`.
 */
function buildEmptySupplyBorrow(slug: string): MultiplyMarketDetail["supplyBorrow"] {
  return {
    supplied: { id: `${slug}:sb:supplied`, label: "Supplied", points: [] },
    borrowed: { id: `${slug}:sb:borrowed`, label: "Borrowed", points: [] },
    utilization: { id: `${slug}:sb:utilization`, label: "Utilization", points: [] },
  }
}

// Request-scoped memoization so generateMetadata + the page body share one Convex
// fan-out per request instead of running it twice.
export const getMultiplyMarketDetailFromConvex = cache(getMultiplyMarketDetailFromConvexUncached)

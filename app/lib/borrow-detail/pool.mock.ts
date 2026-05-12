/**
 * Mock `PoolDetail` factory.
 *
 * - Three hand-curated fixtures for the pools we showcase on the home page
 *   (`eth-usdc`, `wbtc-eth`, `usdc-usdt`) so their numbers match the rest of
 *   the app.
 * - A procedural fallback so every id in `BORROW_POOL_CATALOG` also resolves.
 * - All numeric series are built via the seeded PRNG so charts stay stable.
 *
 * When live data arrives, swap the `buildPoolDetail` call in `index.ts` with
 * an API fetch. Nothing else in the UI layer needs to change.
 */

import {
  BORROW_POOL_CATALOG,
  type BorrowAssetVisual,
  type BorrowPoolRow,
  aprRangeLabel,
  formatCompactUsd,
  getDexById,
  getSpokeById,
} from "@/app/lib/borrow-sim"
import { HOME_COLLATERAL_POOLS } from "@/app/lib/home-sim"
import { buildSeriesFamily, prngFromString } from "./prng"
import { formatBpsAsPct, formatPct, riskLevelFromBps, riskLevelLabel, riskScoreFromBps } from "./allocation"
import type {
  AboutCard,
  CashflowCard,
  ChartMetricId,
  DeltaStat,
  EngagementTrend,
  KeyMetricId,
  PerfPeriod,
  PerfTab,
  PerfTabDataset,
  PoolDetail,
  PoolDetailHero,
  QuickStat,
  RelatedPoolSummary,
  RiskAssessment,
  Series,
  TimeRangeId,
  TxHistoryRow,
} from "./types"
import { ALL_CHART_METRICS, ALL_KEY_METRICS, ALL_PERF_PERIODS, ALL_PERF_TABS } from "./types"

// -------------------------------------------------------------------------
// Home-page id → catalog mapping
// -------------------------------------------------------------------------

/** Maps the compact ids we use on the home page to a real catalog row. */
const HOME_ID_TO_CATALOG_ID: Record<string, string> = {
  "eth-usdc": "uni-v3-bluechip-weth-usdc",
  "wbtc-eth": "uni-v3-bluechip-wbtc-weth",
  "usdc-usdt": "uni-v3-stable-usdc-usdt",
}

/** Resolves any detail-page id to a concrete `BorrowPoolRow`, or null. */
export function resolvePoolRow(poolId: string): BorrowPoolRow | null {
  if (!poolId) return null
  const direct = BORROW_POOL_CATALOG.find((row) => row.id === poolId)
  if (direct) return direct
  const mapped = HOME_ID_TO_CATALOG_ID[poolId]
  if (mapped) {
    const row = BORROW_POOL_CATALOG.find((r) => r.id === mapped)
    if (row) return row
  }
  return null
}

// -------------------------------------------------------------------------
// Hand-curated fixture overrides
// -------------------------------------------------------------------------

type FixtureOverride = {
  /** Human-readable chain tag shown next to the header. */
  chain?: string
  /** Fee tier label, e.g. "0.3%" / "Stable". */
  feeTier?: string
  /** Explorer URL for the source pool (only used in the hero). */
  explorerUrl?: string
  /** Quick-stat overrides, merged over defaults by id. */
  quickStats?: Record<string, Partial<QuickStat>>
  /** Base TVL used by hero + key metrics (overrides catalog liquidity). */
  baseTvlUsd?: number
  /** Daily volume used to seed the hero/volume chart (overrides derived). */
  baseVolumeUsd?: number
  /** Daily fees used to seed the hero/fees chart (overrides derived). */
  baseFeesUsd?: number
  /** About card override (description + stats + history). */
  about?: AboutCard
  /** Risk assessment override for curated pools. */
  risk?: RiskAssessment
  /** Description line shown under the hero title. */
  subtitle?: string
}

const CURATED_FIXTURES: Record<string, FixtureOverride> = {
  "uni-v3-bluechip-weth-usdc": {
    chain: "Ethereum",
    feeTier: "0.30%",
    explorerUrl: "https://app.uniswap.org/explore/pools/ethereum/0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    subtitle: "Concentrated-liquidity ETH/USDC exposure accepted as LP collateral for borrowing.",
    baseTvlUsd: 312_400_000,
    baseVolumeUsd: 48_900_000,
    baseFeesUsd: 146_700,
    quickStats: {
      totalSupplied: { value: "$312.4M", delta: deltaUp(2.4) },
      totalBorrowed: { value: "$48.9M", delta: deltaUp(6.1) },
      riskPremium: { value: formatBpsAsPct(70), delta: deltaUp(6.1) },
      utilization: { value: "62.1%", delta: deltaDown(1.3) },
    },
    about: {
      description:
        "ETH/USDC 0.30% is the deepest Uniswap v3 pool by volume and functions as the benchmark pair for ETH price discovery. The Bluechip spoke accepts these LP positions as borrow collateral, which means this market sits at the intersection of deep trading liquidity, a stable quote asset, and a higher-risk volatile leg. The combination gives borrowers meaningful capacity while still keeping the underwriting rules conservative enough to absorb ETH drawdowns.",
      stats: [],
      history: [
        { date: "2024-05-07", title: "Spoke launched", description: "Uni v3 Bluechip added as collateral source." },
        { date: "2024-11-19", title: "LTV raised to 70%", description: "Risk council bumped the ceiling from 65% to 70%." },
        { date: "2025-08-02", title: "Oracle window shortened", description: "Switched from 60m to 30m TWAP." },
      ],
    },
    risk: {
      premiumBps: 70,
      level: "moderate",
      score: 38,
      headline: "Moderate risk · +0.70% premium",
      summary:
        "ETH/USDC on Uniswap v3 is deep and battle-tested but exposes LPs to ETH volatility. Risk is dominated by impermanent loss and, to a lesser degree, oracle latency during fast moves.",
      breakdown: [
        { id: "vol", label: "ETH volatility", bps: 32, level: "moderate", description: "30d realized σ ≈ 58% annualized — the single biggest contributor to impermanent loss." },
        { id: "depth", label: "Liquidity depth", bps: 8, level: "low", description: "$4.1M of 2% depth across all tiers — ample for liquidations." },
        { id: "oracle", label: "Oracle latency", bps: 18, level: "moderate", description: "30-minute TWAP can lag during sharp moves; mitigated by kink in the risk curve." },
        { id: "smart-contract", label: "Smart-contract surface", bps: 8, level: "low", description: "Uniswap v3 core + NonFungiblePositionManager, both heavily audited and live for 4 years." },
        { id: "il", label: "Expected IL", bps: 4, level: "low", description: "Rolling 90d IL averages 23bps per week for the 0.30% tier." },
      ],
      metrics: [
        { id: "sigma", label: "σ 30d (annualized)", value: "58.4%" },
        { id: "depth", label: "2% depth", value: "$4.1M" },
        { id: "il", label: "Weekly IL (avg)", value: "0.23%" },
        { id: "corr", label: "Dependencies", value: "Uniswap v3, Chainlink ETH" },
      ],
      lastReviewed: "2026-03-11",
    },
  },
  "uni-v3-bluechip-wbtc-weth": {
    chain: "Ethereum",
    feeTier: "0.30%",
    explorerUrl: "https://app.uniswap.org/explore/pools/ethereum/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",
    subtitle: "WBTC/WETH LP positions accepted as collateral in the Bluechip spoke.",
    baseTvlUsd: 148_300_000,
    baseVolumeUsd: 18_200_000,
    baseFeesUsd: 54_600,
    quickStats: {
      totalSupplied: { value: "$148.3M", delta: deltaUp(1.1) },
      totalBorrowed: { value: "$18.2M", delta: deltaUp(3.8) },
      riskPremium: { value: formatBpsAsPct(85), delta: deltaUp(3.8) },
      utilization: { value: "48.3%", delta: deltaDown(0.4) },
    },
    about: {
      description:
        "WBTC/WETH is the dominant on-chain BTC↔ETH trading pair and one of the most familiar blue-chip routes in DeFi. The Bluechip spoke allows it as collateral with a conservative 67% LTV because bridged-BTC custody risk, even when well managed, still deserves a tighter margin than native ETH pairs. That keeps borrowing power useful without treating wrapped BTC like a pure base-asset market.",
      stats: [],
      history: [
        { date: "2024-07-22", title: "Pool onboarded", description: "WBTC/WETH added to the Bluechip spoke." },
        { date: "2025-02-14", title: "Dual-oracle", description: "Added Chainlink feed alongside the TWAP for resilience." },
      ],
    },
    risk: {
      premiumBps: 85,
      level: "moderate",
      score: 44,
      headline: "Moderate risk · +0.85% premium",
      summary:
        "WBTC carries BitGo custody risk on top of BTC volatility. The pair's depth is comfortable and the dual-oracle setup mitigates single-feed failure modes.",
      breakdown: [
        { id: "vol", label: "BTC volatility", bps: 28, level: "moderate", description: "30d realized σ ≈ 48% annualized." },
        { id: "custody", label: "WBTC custody", bps: 30, level: "elevated", description: "WBTC depends on BitGo custody — reviewed monthly by the risk council." },
        { id: "oracle", label: "Oracle", bps: 14, level: "low", description: "Chainlink feed + 30m TWAP with deviation guardrails." },
        { id: "depth", label: "Liquidity depth", bps: 8, level: "low", description: "$2.6M of 2% depth." },
        { id: "il", label: "Expected IL", bps: 5, level: "low", description: "BTC/ETH is highly correlated — IL is usually <15bps/week." },
      ],
      metrics: [
        { id: "sigma", label: "σ 30d (annualized)", value: "48.1%" },
        { id: "depth", label: "2% depth", value: "$2.6M" },
        { id: "corr", label: "BTC↔ETH 30d ρ", value: "0.81" },
        { id: "deps", label: "Dependencies", value: "BitGo, Chainlink" },
      ],
      lastReviewed: "2026-03-11",
    },
  },
  "uni-v3-stable-usdc-usdt": {
    chain: "Ethereum",
    feeTier: "0.01%",
    explorerUrl: "https://app.uniswap.org/explore/pools/ethereum/0x3416cF6C708Da44DB2624D63ea0AAef7113527C6",
    subtitle: "Full-range USDC/USDT liquidity accepted in the Stable spoke at up to 78% LTV.",
    baseTvlUsd: 198_600_000,
    baseVolumeUsd: 22_100_000,
    baseFeesUsd: 2_210,
    quickStats: {
      totalSupplied: { value: "$198.6M", delta: deltaUp(0.4) },
      totalBorrowed: { value: "$22.1M", delta: deltaUp(1.9) },
      riskPremium: { value: formatBpsAsPct(25), delta: deltaUp(1.9) },
      utilization: { value: "71.4%", delta: deltaUp(0.8) },
    },
    about: {
      description:
        "USDC and USDT both trade at parity and the pool is overwhelmingly used for order-routing, stability-seeking flow, and tight-spread execution. The Stable spoke admits it with a high LTV because peg-risk is shared, depth is enormous, and the pool behaves more like cash infrastructure than a typical volatile LP. That makes it a natural fit for users who want borrowing power while keeping the underlying collateral profile simple to reason about.",
      stats: [],
      history: [
        { date: "2024-04-15", title: "Stable spoke launch", description: "USDC/USDT included from day 1." },
        { date: "2025-03-09", title: "De-peg drill", description: "Circuit-breaker simulated during USDC March 2023 re-run — no forced liquidations." },
      ],
    },
    risk: {
      premiumBps: 25,
      level: "low",
      score: 14,
      headline: "Low risk · +0.25% premium",
      summary:
        "Peg-to-peg correlation keeps impermanent loss negligible. The only tail scenarios involve a USDC or USDT de-peg; both are paused automatically by our oracle deviation guard.",
      breakdown: [
        { id: "depeg", label: "De-peg tail", bps: 12, level: "low", description: "Guardrails pause new borrows if the Chainlink feed deviates >50bps for 5m." },
        { id: "issuer", label: "Issuer solvency", bps: 6, level: "low", description: "Circle + Tether attestations ingested weekly." },
        { id: "depth", label: "Liquidity depth", bps: 2, level: "low", description: "$18M of 2% depth." },
        { id: "sc", label: "Smart-contract surface", bps: 3, level: "low", description: "Uniswap v3 + LP NFT only." },
        { id: "il", label: "Expected IL", bps: 2, level: "low", description: "Correlated assets → IL near zero in normal conditions." },
      ],
      metrics: [
        { id: "sigma", label: "σ 30d (annualized)", value: "1.4%" },
        { id: "depth", label: "2% depth", value: "$18M" },
        { id: "deps", label: "Dependencies", value: "Circle, Tether" },
        { id: "corr", label: "USDC↔USDT 30d ρ", value: "0.99" },
      ],
      lastReviewed: "2026-03-18",
    },
  },
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function deltaUp(pct: number): DeltaStat {
  return { value: pct, direction: "up", label: `+${pct.toFixed(1)}%` }
}

function deltaDown(pct: number): DeltaStat {
  return { value: -Math.abs(pct), direction: "down", label: `-${Math.abs(pct).toFixed(1)}%` }
}

function pickChain(row: BorrowPoolRow): string {
  const venue = row.venue.toLowerCase()
  if (venue.includes("aerodrome") || venue.includes("base")) return "Base"
  if (venue.includes("arbitrum")) return "Arbitrum"
  if (venue.includes("optimism")) return "Optimism"
  return "Ethereum"
}

function buildDefaultQuickStats(row: BorrowPoolRow): QuickStat[] {
  const spoke = getSpokeById(row.spoke)
  const totalSupplied = spoke.liquidityUsd
  const totalBorrowed = Math.round(totalSupplied * (row.ltv / 100))
  return [
    { id: "totalSupplied", label: "Total Supplied", value: formatCompactUsd(totalSupplied), delta: deltaUp(1.8) },
    { id: "totalBorrowed", label: "Total Borrowed", value: formatCompactUsd(totalBorrowed), delta: deltaUp(2.9) },
    { id: "riskPremium", label: "Risk premium", value: formatBpsAsPct(row.riskPremiumBps), delta: deltaUp(2.9) },
    { id: "apr", label: "Supply APY", value: `${((row.aprMin + row.aprMax) / 2).toFixed(1)}%`, delta: deltaUp(0.3) },
    { id: "utilization", label: "Utilization", value: formatPct(spoke.maxLtv * 0.82, 1) },
    { id: "maxLtv", label: "Max LTV", value: formatPct(spoke.maxLtv, 1) },
    { id: "available", label: "Available to borrow", value: formatCompactUsd(row.availableUsd) },
  ]
}

function mergeQuickStats(defaults: QuickStat[], overrides?: FixtureOverride["quickStats"]): QuickStat[] {
  if (!overrides) return defaults
  return defaults.map((stat) => ({ ...stat, ...(overrides[stat.id] ?? {}) }))
}

function buildHero(row: BorrowPoolRow, fixture: FixtureOverride | undefined): PoolDetailHero {
  const venue = row.venue
  const visuals: [BorrowAssetVisual, BorrowAssetVisual] = row.visuals
  return {
    visuals,
    name: row.name,
    venue,
    subtitle: fixture?.subtitle ?? `${row.name} accepted as LP collateral. Supply to unlock borrow power.`,
    feeTier: fixture?.feeTier,
    chain: fixture?.chain ?? pickChain(row),
    explorerUrl: fixture?.explorerUrl,
  }
}

function buildHeroMetricSeries(
  row: BorrowPoolRow,
  fixture: FixtureOverride | undefined,
): Record<ChartMetricId, Record<TimeRangeId, Series>> {
  const spoke = getSpokeById(row.spoke)
  const baseTvl = fixture?.baseTvlUsd ?? spoke.liquidityUsd
  const baseVol = fixture?.baseVolumeUsd ?? Math.round(baseTvl * 0.12)
  const baseFees = fixture?.baseFeesUsd ?? Math.round(baseVol * 0.003)
  const basePrice = pairReferencePrice(row)
  return {
    tvl: buildSeriesFamily(`${row.id}:tvl`, "TVL", { base: baseTvl, driftMultiplier: 1.08, noise: 0.04, wave: 0.08, nonNegative: true, roundTo: 0 }),
    volume: buildSeriesFamily(`${row.id}:volume`, "Volume", { base: baseVol, driftMultiplier: 1.12, noise: 0.15, wave: 0.22, nonNegative: true, roundTo: 0 }),
    fees: buildSeriesFamily(`${row.id}:fees`, "Fees", { base: baseFees, driftMultiplier: 1.1, noise: 0.18, wave: 0.22, nonNegative: true, roundTo: 0 }),
    price: buildSeriesFamily(`${row.id}:price`, "Price", { base: basePrice, driftMultiplier: 1.04, noise: 0.02, wave: 0.06, nonNegative: true, roundTo: 4 }),
  }
}

function pairReferencePrice(row: BorrowPoolRow): number {
  const [a, b] = row.visuals.map((x) => x.symbol.toUpperCase())
  if (a === b) return 1
  if (a === "WBTC" && b === "WETH") return 15.8
  if (a === "WETH" && b === "USDC") return 3_450
  if (a === "USDC" && b === "USDT") return 1
  if (a === "ETH" && b.includes("ETH")) return 1
  if (a.includes("BTC") && b.includes("ETH")) return 15.8
  if (b === "USDC" || b === "USDT" || b === "DAI") return 1_200
  return 1
}

function buildKeyMetrics(row: BorrowPoolRow, fixture: FixtureOverride | undefined): Record<KeyMetricId, Record<TimeRangeId, Series>> {
  const spoke = getSpokeById(row.spoke)
  const tvl = fixture?.baseTvlUsd ?? spoke.liquidityUsd
  const vol = fixture?.baseVolumeUsd ?? Math.round(tvl * 0.12)
  const fees = fixture?.baseFeesUsd ?? Math.round(vol * 0.003)
  const shapes: Record<KeyMetricId, Parameters<typeof buildSeriesFamily>[2]> = {
    tvl: { base: tvl, driftMultiplier: 1.08, noise: 0.04, nonNegative: true, roundTo: 0 },
    volume: { base: vol, driftMultiplier: 1.12, noise: 0.15, nonNegative: true, roundTo: 0 },
    fees: { base: fees, driftMultiplier: 1.1, noise: 0.18, nonNegative: true, roundTo: 0 },
    feesApr: { base: row.aprMin + 0.5, driftMultiplier: 1.05, noise: 0.08, nonNegative: true, roundTo: 2 },
    rewards: { base: fees * 0.4, driftMultiplier: 1.04, noise: 0.12, nonNegative: true, roundTo: 0 },
    utilization: { base: spoke.maxLtv * 0.82, driftMultiplier: 1.02, noise: 0.04, nonNegative: true, roundTo: 1 },
    borrowApr: { base: (row.aprMin + row.aprMax) / 2, driftMultiplier: 1.04, noise: 0.05, nonNegative: true, roundTo: 2 },
    incentives: { base: fees * 0.2, driftMultiplier: 1.05, noise: 0.2, nonNegative: true, roundTo: 0 },
    depth2pct: { base: tvl * 0.02, driftMultiplier: 1.01, noise: 0.06, nonNegative: true, roundTo: 0 },
    volatility30d: { base: 42, driftMultiplier: 0.96, noise: 0.12, nonNegative: true, roundTo: 2 },
    impermanentLoss: { base: 0.25, driftMultiplier: 1.08, noise: 0.4, nonNegative: true, roundTo: 2 },
    oraclePremium: { base: 0.12, driftMultiplier: 1.02, noise: 0.2, nonNegative: true, roundTo: 2 },
  }
  const out = {} as Record<KeyMetricId, Record<TimeRangeId, Series>>
  for (const id of ALL_KEY_METRICS) {
    out[id] = buildSeriesFamily(`${row.id}:km:${id}`, id, shapes[id])
  }
  return out
}

function buildPerformance(row: BorrowPoolRow, fixture: FixtureOverride | undefined): Record<PerfTab, Record<PerfPeriod, PerfTabDataset>> {
  const tvl = fixture?.baseTvlUsd ?? getSpokeById(row.spoke).liquidityUsd
  const vol = fixture?.baseVolumeUsd ?? Math.round(tvl * 0.12)
  const fees = fixture?.baseFeesUsd ?? Math.round(vol * 0.003)
  const tabs: Record<PerfTab, { base: number; unit: string; headlineFmt: (n: number) => string }> = {
    fees: { base: fees, unit: "$", headlineFmt: formatCompactUsd },
    pnl: { base: fees * 1.4, unit: "$", headlineFmt: formatCompactUsd },
    composition: { base: tvl, unit: "$", headlineFmt: formatCompactUsd },
    incentives: { base: fees * 0.4, unit: "$", headlineFmt: formatCompactUsd },
  }
  const periods: Record<PerfPeriod, { scale: number; label: string }> = {
    weekly: { scale: 7, label: "7d" },
    monthly: { scale: 30, label: "30d" },
    quarterly: { scale: 90, label: "90d" },
  }
  const out = {} as Record<PerfTab, Record<PerfPeriod, PerfTabDataset>>
  for (const tab of ALL_PERF_TABS) {
    const tabCfg = tabs[tab]
    const inner = {} as Record<PerfPeriod, PerfTabDataset>
    for (const period of ALL_PERF_PERIODS) {
      const { scale, label } = periods[period]
      const headline = tabCfg.headlineFmt(tabCfg.base * scale)
      const series: Series = {
        id: `${row.id}:perf:${tab}:${period}`,
        label: `${tab} · ${label}`,
        points: buildSeriesFamily(`${row.id}:perf:${tab}:${period}`, tab, {
          base: tabCfg.base,
          driftMultiplier: 1.05,
          noise: 0.18,
          nonNegative: true,
          roundTo: 0,
        })["1M"].points,
      }
      const breakdown = buildPerfBreakdown(tab, tabCfg.base * scale, tabCfg.headlineFmt)
      inner[period] = {
        headline,
        subLabel: `vs previous ${label} ${deltaLabelForSeed(`${row.id}:${tab}:${period}`)}`,
        series,
        breakdown,
      }
    }
    out[tab] = inner
  }
  return out
}

function deltaLabelForSeed(seed: string): string {
  const rand = prngFromString(seed)()
  const pct = Math.round((rand * 18 - 6) * 10) / 10
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
}

function buildPerfBreakdown(tab: PerfTab, total: number, fmt: (n: number) => string): PerfTabDataset["breakdown"] {
  const rows: PerfTabDataset["breakdown"] = []
  if (tab === "fees") {
    rows.push(
      { label: "Swap fees", value: fmt(total * 0.78), delta: { value: 4.8, direction: "up", label: "+4.8%" } },
      { label: "LP incentives", value: fmt(total * 0.18), delta: { value: 1.2, direction: "up", label: "+1.2%" } },
      { label: "Protocol cut", value: fmt(total * 0.04), delta: { value: -0.3, direction: "down", label: "-0.3%" } },
    )
  } else if (tab === "pnl") {
    rows.push(
      { label: "Fees earned", value: fmt(total * 0.62), delta: { value: 3.4, direction: "up", label: "+3.4%" } },
      { label: "Divergence loss", value: fmt(total * 0.28), delta: { value: -2.1, direction: "down", label: "-2.1%" } },
      { label: "Incentives", value: fmt(total * 0.1), delta: { value: 0.9, direction: "up", label: "+0.9%" } },
    )
  } else if (tab === "composition") {
    rows.push(
      { label: "Token A share", value: fmt(total * 0.52) },
      { label: "Token B share", value: fmt(total * 0.48) },
      { label: "Out-of-range liquidity", value: fmt(total * 0.06) },
    )
  } else {
    rows.push(
      { label: "Protocol rewards", value: fmt(total * 0.72), delta: { value: 2.1, direction: "up", label: "+2.1%" } },
      { label: "External incentives", value: fmt(total * 0.28), delta: { value: -0.4, direction: "down", label: "-0.4%" } },
    )
  }
  return rows
}

function buildCashflow(row: BorrowPoolRow, fixture: FixtureOverride | undefined): CashflowCard {
  const tvl = fixture?.baseTvlUsd ?? getSpokeById(row.spoke).liquidityUsd
  const vol = fixture?.baseVolumeUsd ?? Math.round(tvl * 0.12)
  const fees = fixture?.baseFeesUsd ?? Math.round(vol * 0.003)
  const feesSeries = buildSeriesFamily(`${row.id}:cashflow:fees`, "Fees", { base: fees * 30, driftMultiplier: 1.04, noise: 0.1, nonNegative: true, roundTo: 0 })["1Y"]
  const incentivesSeries = buildSeriesFamily(`${row.id}:cashflow:incentives`, "Incentives", { base: fees * 12, driftMultiplier: 1.06, noise: 0.2, nonNegative: true, roundTo: 0 })["1Y"]
  return {
    bars: [feesSeries, incentivesSeries],
    periodLabel: "Last 12 months",
    rows: [
      { label: "Swap fees", reported: formatCompactUsd(fees * 365 * 0.78), yoy: { value: 12.4, direction: "up", label: "+12.4%" }, highlighted: true },
      { label: "LP incentives", reported: formatCompactUsd(fees * 365 * 0.18), yoy: { value: 8.1, direction: "up", label: "+8.1%" } },
      { label: "Protocol revenue", reported: formatCompactUsd(fees * 365 * 0.04), yoy: { value: -1.1, direction: "down", label: "-1.1%" } },
      { label: "Rewards emitted", reported: formatCompactUsd(fees * 365 * 0.12), yoy: { value: 2.8, direction: "up", label: "+2.8%" } },
      { label: "Net to suppliers", reported: formatCompactUsd(fees * 365 * 0.9), yoy: { value: 10.2, direction: "up", label: "+10.2%" }, highlighted: true },
    ],
  }
}

function buildPoolEngagement(row: BorrowPoolRow, fixture: FixtureOverride | undefined): EngagementTrend {
  const rand = prngFromString(`${row.id}:engagement`)
  const tvl = fixture?.baseTvlUsd ?? getSpokeById(row.spoke).liquidityUsd
  const base = Math.max(600, Math.round(Math.sqrt(tvl) * 1.3))
  const now = Date.UTC(2026, 3, 22)
  const samples = 12
  const points: Series["points"] = []
  for (let i = samples - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    const t = d.toISOString().slice(0, 10)
    const wave = 1 + Math.sin(((samples - 1 - i) / samples) * Math.PI * 2) * 0.2
    const noise = 1 + (rand() - 0.5) * 0.25
    const v = Math.max(0, Math.round(base * wave * noise))
    points.push({ t, v })
  }
  const last = points[points.length - 1].v
  const total = points.reduce((a, p) => a + p.v, 0)
  const conversion = 4 + rand() * 10
  const pctDelta = (p: number): DeltaStat =>
    p === 0
      ? { value: 0, direction: "flat", label: "0.0%" }
      : p > 0
        ? { value: p, direction: "up", label: `+${p.toFixed(1)}%` }
        : { value: p, direction: "down", label: `${p.toFixed(1)}%` }
  return {
    title: "User Engagement Trends",
    primary: {
      label: "Active wallets",
      valueLabel: last.toLocaleString(),
      delta: pctDelta(Math.round((rand() * 14 + 2) * 10) / 10),
    },
    secondary: {
      label: "Borrow conversion",
      valueLabel: `${conversion.toFixed(1)}%`,
      delta: pctDelta(Math.round((rand() * 4 - 1) * 10) / 10),
    },
    series: {
      id: `${row.id}:engagement`,
      label: "Active wallets",
      points,
      aggregate: total / samples,
    },
  }
}

function buildRisk(row: BorrowPoolRow, fixture: FixtureOverride | undefined): RiskAssessment {
  if (fixture?.risk) return fixture.risk
  const bps = row.riskPremiumBps
  const level = riskLevelFromBps(bps)
  const score = riskScoreFromBps(bps)
  const headline = `${riskLevelLabel(level)} risk · ${formatBpsAsPct(bps)} premium`
  return {
    premiumBps: bps,
    level,
    score,
    headline,
    summary: `Risk premium is derived from pool volatility, depth, oracle latency, and spoke parameters (${getSpokeById(row.spoke).label}).`,
    breakdown: [
      { id: "vol", label: "Pair volatility", bps: Math.round(bps * 0.42), level, description: "Realized 30d σ relative to the spoke's target band." },
      { id: "depth", label: "Liquidity depth", bps: Math.round(bps * 0.18), level: "low", description: "Depth at ±2% is above the spoke's liquidation threshold." },
      { id: "oracle", label: "Oracle", bps: Math.round(bps * 0.22), level, description: "Primary oracle + deviation guard monitored by the risk council." },
      { id: "sc", label: "Smart-contract surface", bps: Math.round(bps * 0.12), level: "low", description: "Source dex + LP wrapper audits reviewed quarterly." },
      { id: "il", label: "Expected IL", bps: Math.max(2, Math.round(bps * 0.06)), level: "low", description: "Rolling 90d weekly impermanent loss for this tier." },
    ],
    metrics: [
      { id: "dex", label: "Source dex", value: getDexById(row.dexes[0]?.id as Parameters<typeof getDexById>[0])?.label ?? row.venue },
      { id: "spoke", label: "Spoke", value: getSpokeById(row.spoke).label },
      { id: "maxLtv", label: "Max LTV", value: formatPct(getSpokeById(row.spoke).maxLtv, 0) },
      { id: "apr", label: "Supply APY range", value: aprRangeLabel(row) },
    ],
  }
}

function buildAbout(row: BorrowPoolRow, fixture: FixtureOverride | undefined): AboutCard {
  if (fixture?.about) return fixture.about
  const spoke = getSpokeById(row.spoke)
  return {
    description:
      `${row.name} on ${getDexById(row.dexes[0]?.id as Parameters<typeof getDexById>[0])?.label ?? row.venue} is treated as LP collateral inside the ${spoke.label}. ` +
      `The pool's depth, fee tier, and pair composition determine how much it can support, while the spoke's max LTV keeps the borrow power anchored to the market's actual risk. ` +
      `That gives this page a single source of truth for how the pool should be understood: what it is, how much capital it can safely support, and what kind of downside the protocol is underwriting.`,
    stats: [],
    history: [
      { date: "2025-01-14", title: "Onboarded", description: `Added to the ${spoke.label}.` },
      { date: "2025-06-02", title: "Parameters refreshed", description: "Quarterly risk review — no changes to LTV." },
    ],
  }
}

function buildRelated(row: BorrowPoolRow): RelatedPoolSummary[] {
  return BORROW_POOL_CATALOG.filter((other) => other.spoke === row.spoke && other.id !== row.id)
    .slice(0, 4)
    .map((other) => ({
      id: other.id,
      name: other.name,
      venue: other.venue,
      visuals: other.visuals,
      aprLabel: aprRangeLabel(other),
      availableLabel: formatCompactUsd(other.availableUsd),
    }))
}

function buildCollateralHistory(row: BorrowPoolRow): TxHistoryRow[] {
  const seed = prngFromString(`${row.id}:tx`)
  const kinds: TxHistoryRow["kind"][] = ["supply", "withdraw", "rewards"]
  const now = Date.UTC(2026, 3, 23)
  const out: TxHistoryRow[] = []

  for (let i = 0; i < 12; i++) {
    const kind = kinds[Math.floor(seed() * kinds.length)]
    const amountBase = kind === "rewards" ? 250 + seed() * 15_000 : 50_000 + seed() * 1_950_000
    const amount = Math.round(amountBase / 100) * 100
    const at = new Date(now - i * 6 * 60 * 60 * 1000 - Math.floor(seed() * 86_400_000)).toISOString()
    const prefix = kind === "withdraw" ? "-" : "+"
    out.push({
      id: `${row.id}-tx-${i}`,
      at,
      kind,
      amountLabel: `${prefix}${formatCompactUsd(amount)}`,
      counterpartyLabel:
        kind === "rewards"
          ? `Fee claim · ${row.venue}`
          : `${kind === "supply" ? "Added" : "Removed"} collateral · ${row.name}`,
      txHashShort: `0x${Math.floor(seed() * 0xffffff).toString(16).padStart(6, "0")}…${Math.floor(seed() * 0xffff).toString(16).padStart(4, "0")}`,
    })
  }

  return out
}

// -------------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------------

export function buildPoolDetail(row: BorrowPoolRow): PoolDetail {
  const fixture = CURATED_FIXTURES[row.id]
  const heroMetricSeries = buildHeroMetricSeries(row, fixture)
  const baseTvl = fixture?.baseTvlUsd ?? getSpokeById(row.spoke).liquidityUsd
  return {
    id: row.id,
    hero: buildHero(row, fixture),
    heroMetric: {
      metricId: "tvl",
      valueLabel: fixture?.quickStats?.tvl?.value ?? formatCompactUsd(baseTvl),
      delta: fixture?.quickStats?.tvl?.delta ?? deltaUp(2.1),
      series: heroMetricSeries,
    },
    quickStats: mergeQuickStats(buildDefaultQuickStats(row), fixture?.quickStats),
    performance: buildPerformance(row, fixture),
    keyMetrics: buildKeyMetrics(row, fixture),
    cashflow: buildCashflow(row, fixture),
    engagement: buildPoolEngagement(row, fixture),
    risk: buildRisk(row, fixture),
    about: buildAbout(row, fixture),
    transactions: buildCollateralHistory(row),
    related: buildRelated(row),
    governanceNotes: [
      { title: "Risk council", body: "Quarterly risk review touches every active pool.", tone: "info" },
      { title: "Fee-split", body: "90% of swap fees flow to suppliers, 10% to the protocol treasury.", tone: "positive" },
    ],
    row,
  }
}

/** Exposed so the app can enumerate home-page → detail-page ids in tests. */
export const HOME_POOL_ID_MAP = HOME_ID_TO_CATALOG_ID

/**
 * Accepts any id (home id, catalog id, or arbitrary input) and returns the
 * concrete row + the resolved id it maps to. Used by `index.ts` and by the
 * error-handling paths on the page.
 */
export function tryGetPoolRow(id: string): { row: BorrowPoolRow; resolvedId: string } | null {
  const row = resolvePoolRow(id)
  if (!row) {
    const fallback = HOME_COLLATERAL_POOLS.length > 0 ? null : null
    return fallback
  }
  return { row, resolvedId: row.id }
}

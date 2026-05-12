/**
 * Mock `AssetDetail` factory. Mirrors pool.mock.ts but for borrowable assets.
 *
 * - Hand-curated overrides for USDC / ETH / WBTC (the three likely demos).
 * - Procedural fallback for every other `BorrowableAsset` in borrow-sim.ts.
 * - Allocation rows come from `allocation.ts::computeAssetAllocation`.
 *
 * Swap `buildAssetDetail` for a live fetch in `index.ts` when ready.
 */

import {
  BORROW_POOL_CATALOG,
  BORROWABLE_ASSETS,
  type BorrowableAsset,
  formatCompactUsd,
} from "@/app/lib/borrow-sim"
import { buildSeries, buildSeriesFamily, prngFromString } from "./prng"
import {
  computeAssetAllocation,
  formatBpsAsPct,
  formatPct,
  riskLevelFromBps,
  riskLevelLabel,
  riskScoreFromBps,
} from "./allocation"
import type {
  AboutCard,
  AllocationRow,
  AssetChartMetricId,
  AssetDetail,
  AssetDetailHero,
  CashflowCard,
  CashflowTrend,
  DeltaStat,
  EngagementTrend,
  KeyMetricId,
  PerfPeriod,
  PerfTabDataset,
  QuickStat,
  RelatedAssetSummary,
  RiskAssessment,
  Series,
  TimeRangeId,
  TxHistoryRow,
} from "./types"
import { ALL_ASSET_CHART_METRICS, ALL_KEY_METRICS, ALL_PERF_PERIODS } from "./types"

type AssetFixture = {
  chain?: string
  /** Base total-supplied USD used to seed the supply chart. */
  baseSuppliedUsd?: number
  /** Base total-borrowed USD used to seed the borrow chart. */
  baseBorrowedUsd?: number
  /** Subtitle shown under the hero. */
  subtitle?: string
  about?: AboutCard
  risk?: RiskAssessment
  quickStats?: Record<string, Partial<QuickStat>>
}

const ASSET_FIXTURES: Record<string, AssetFixture> = {
  usdc: {
    chain: "Ethereum",
    baseSuppliedUsd: 205_670_000,
    baseBorrowedUsd: 166_240_000,
    subtitle: "The deepest stablecoin on the protocol — borrowed to lever up LP collateral and for stable-to-stable carry.",
    quickStats: {
      supplied: { value: "$205.67M", delta: { value: 2.1, direction: "up", label: "+2.1%" } },
      borrowed: { value: "$166.24M", delta: { value: 1.4, direction: "up", label: "+1.4%" } },
      utilization: { value: "80.83%", delta: { value: 0.5, direction: "up", label: "+0.5%" } },
      supplyApy: { value: "6.32%" },
      supplyApy90d: { value: "6.44%" },
    },
    about: {
      description:
        "USDC is Circle's regulated, fully-backed USD stablecoin and the main unit of account for this market. It anchors the protocol's conservative borrow curves, acts as the default settlement asset for LP carry strategies, and serves as the reference point for risk pricing across stablecoin routes. In practice, that makes it the most common asset for users who want cash-like exposure with on-chain mobility.",
      stats: [],
      history: [
        { date: "2024-04-01", title: "Launch", description: "USDC listed day-1 with 80% borrow cap." },
        { date: "2025-03-09", title: "De-peg drill", description: "Simulated 2023-style de-peg; guardrails paused borrows for 18m." },
        { date: "2026-01-22", title: "Cap raised", description: "Supply cap raised to $250M after utilization sustained >75% for 30 days." },
      ],
    },
    risk: {
      premiumBps: 25,
      level: "low",
      score: 14,
      headline: "Low risk · +0.25% premium",
      summary: "USDC is the benchmark stable. Depeg tail is the dominant risk; monitored by deviation guards and Circle attestations.",
      breakdown: [
        { id: "depeg", label: "De-peg tail", bps: 12, level: "low", description: "Guardrails pause borrows on >50bps Chainlink deviation for 5m." },
        { id: "issuer", label: "Issuer solvency", bps: 6, level: "low", description: "Weekly Circle attestations ingested into the oracle pipeline." },
        { id: "bridge", label: "Bridge surface", bps: 4, level: "low", description: "Canonical bridge only; non-canonical deployments are blocked." },
        { id: "sc", label: "Smart-contract surface", bps: 3, level: "low", description: "Standard ERC-20 implementation." },
      ],
      metrics: [
        { id: "peg", label: "30d peg deviation (max)", value: "7 bps" },
        { id: "supplyCap", label: "Supply cap", value: "$250M" },
        { id: "oracle", label: "Oracle", value: "Chainlink USDC/USD" },
        { id: "issuer", label: "Issuer", value: "Circle (US)" },
      ],
      lastReviewed: "2026-03-18",
    },
  },
  eth: {
    chain: "Ethereum",
    baseSuppliedUsd: 168_400_000,
    baseBorrowedUsd: 92_600_000,
    subtitle: "Native ETH — the primary volatile borrow asset for directional carry on LP collateral.",
  },
  weth: {
    chain: "Ethereum",
    baseSuppliedUsd: 204_100_000,
    baseBorrowedUsd: 118_300_000,
    subtitle: "Wrapped ETH is the canonical ERC-20 used by Uniswap/Balancer/Aerodrome pools.",
  },
  wbtc: {
    chain: "Ethereum",
    baseSuppliedUsd: 96_200_000,
    baseBorrowedUsd: 42_300_000,
    subtitle: "Wrapped BTC exposure — borrowed to short BTC against blue-chip LPs.",
  },
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function deltaFromPct(pct: number): DeltaStat {
  if (pct === 0) return { value: 0, direction: "flat", label: "0.0%" }
  return pct > 0
    ? { value: pct, direction: "up", label: `+${pct.toFixed(1)}%` }
    : { value: pct, direction: "down", label: `${pct.toFixed(1)}%` }
}

function buildHero(asset: BorrowableAsset, fixture: AssetFixture | undefined): AssetDetailHero {
  return {
    visual: asset.visual,
    name: asset.name,
    symbol: asset.symbol,
    subtitle: fixture?.subtitle ?? `${asset.name} — ${asset.subtitle}.`,
    chain: fixture?.chain ?? "Ethereum",
    category: asset.category,
  }
}

function buildQuickStats(asset: BorrowableAsset, supplied: number, borrowed: number, fixture: AssetFixture | undefined): QuickStat[] {
  const utilization = borrowed / supplied
  const defaults: QuickStat[] = [
    { id: "supplied", label: "Total Supplied", value: formatCompactUsd(supplied), delta: deltaFromPct(1.8) },
    { id: "borrowed", label: "Total Borrowed", value: formatCompactUsd(borrowed), delta: deltaFromPct(1.1) },
    { id: "utilization", label: "Utilization", value: formatPct(utilization * 100, 2), delta: deltaFromPct(-0.6) },
    { id: "supplyApy", label: "Supply APY", value: `${(asset.borrowApr * 0.85).toFixed(2)}%`, delta: deltaFromPct(0.1) },
    { id: "supplyApy90d", label: "Supply APY (90D Avg)", value: `${(asset.borrowApr * 0.83).toFixed(2)}%` },
    { id: "borrowApy", label: "Borrow APY", value: `${asset.borrowApr.toFixed(2)}%`, delta: deltaFromPct(0.08) },
    { id: "available", label: "Available", value: formatCompactUsd(asset.availableUsd) },
  ]
  if (!fixture?.quickStats) return defaults
  return defaults.map((stat) => ({ ...stat, ...(fixture.quickStats?.[stat.id] ?? {}) }))
}

function buildHeroSeries(
  asset: BorrowableAsset,
  supplied: number,
  borrowed: number,
): Record<AssetChartMetricId, Record<TimeRangeId, Series>> {
  const utilizationBase = Math.max(1, Math.min(95, (borrowed / supplied) * 100))
  const apyBase = asset.borrowApr
  return {
    supply: buildSeriesFamily(`${asset.id}:supply`, "Total Supplied", { base: supplied, driftMultiplier: 1.08, noise: 0.03, wave: 0.05, nonNegative: true, roundTo: 0 }),
    borrow: buildSeriesFamily(`${asset.id}:borrow`, "Total Borrowed", { base: borrowed, driftMultiplier: 1.06, noise: 0.04, wave: 0.06, nonNegative: true, roundTo: 0 }),
    utilization: buildSeriesFamily(`${asset.id}:util`, "Utilization", { base: utilizationBase, driftMultiplier: 1.02, noise: 0.05, wave: 0.08, nonNegative: true, roundTo: 2 }),
    apy: buildSeriesFamily(`${asset.id}:apy`, "Borrow APY", { base: apyBase, driftMultiplier: 1.04, noise: 0.08, wave: 0.1, nonNegative: true, roundTo: 2 }),
  }
}

function buildSupplyBorrow(asset: BorrowableAsset, supplied: number, borrowed: number) {
  return {
    supplied: buildSeries(`${asset.id}:sb:supply`, "1Y", "Supplied", { base: supplied, driftMultiplier: 1.12, noise: 0.04, nonNegative: true, roundTo: 0 }),
    borrowed: buildSeries(`${asset.id}:sb:borrow`, "1Y", "Borrowed", { base: borrowed, driftMultiplier: 1.09, noise: 0.05, nonNegative: true, roundTo: 0 }),
    utilization: buildSeries(`${asset.id}:sb:util`, "1Y", "Utilization", {
      base: Math.max(1, Math.min(95, (borrowed / supplied) * 100)),
      driftMultiplier: 1.02,
      noise: 0.05,
      nonNegative: true,
      roundTo: 2,
    }),
  }
}

function buildInterestGenerated(asset: BorrowableAsset, borrowed: number): Record<PerfPeriod, PerfTabDataset> {
  const periods: Record<PerfPeriod, { scale: number; label: string }> = {
    weekly: { scale: 7, label: "7d" },
    monthly: { scale: 30, label: "30d" },
    quarterly: { scale: 90, label: "90d" },
  }
  const dailyInterest = borrowed * (asset.borrowApr / 100) / 365
  const out = {} as Record<PerfPeriod, PerfTabDataset>
  for (const period of ALL_PERF_PERIODS) {
    const { scale, label } = periods[period]
    const base = dailyInterest * scale
    out[period] = {
      headline: formatCompactUsd(base),
      subLabel: `vs previous ${label} ${deltaForPeriod(asset.id, period)}`,
      series: buildSeries(`${asset.id}:int:${period}`, "1M", "Interest", { base: dailyInterest, driftMultiplier: 1.06, noise: 0.18, nonNegative: true, roundTo: 0 }),
      breakdown: [
        { label: "To suppliers", value: formatCompactUsd(base * 0.9), delta: deltaFromPct(3.2) },
        { label: "Reserve", value: formatCompactUsd(base * 0.1), delta: deltaFromPct(3.2) },
      ],
    }
  }
  return out
}

function deltaForPeriod(id: string, period: PerfPeriod): string {
  const r = prngFromString(`${id}:${period}`)()
  const pct = Math.round((r * 16 - 4) * 10) / 10
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`
}

function buildAssetKeyMetrics(asset: BorrowableAsset, supplied: number, borrowed: number): Record<KeyMetricId, Record<TimeRangeId, Series>> {
  const utilization = Math.min(95, (borrowed / supplied) * 100)
  const shapes: Record<KeyMetricId, Parameters<typeof buildSeriesFamily>[2]> = {
    tvl: { base: supplied, driftMultiplier: 1.08, noise: 0.04, nonNegative: true, roundTo: 0 },
    volume: { base: borrowed * 0.2, driftMultiplier: 1.08, noise: 0.12, nonNegative: true, roundTo: 0 },
    fees: { base: borrowed * asset.borrowApr * 0.0001, driftMultiplier: 1.06, noise: 0.14, nonNegative: true, roundTo: 0 },
    feesApr: { base: asset.borrowApr * 0.85, driftMultiplier: 1.02, noise: 0.06, nonNegative: true, roundTo: 2 },
    rewards: { base: borrowed * 0.002, driftMultiplier: 1.05, noise: 0.18, nonNegative: true, roundTo: 0 },
    utilization: { base: utilization, driftMultiplier: 1.02, noise: 0.05, nonNegative: true, roundTo: 1 },
    borrowApr: { base: asset.borrowApr, driftMultiplier: 1.04, noise: 0.06, nonNegative: true, roundTo: 2 },
    incentives: { base: borrowed * 0.001, driftMultiplier: 1.05, noise: 0.2, nonNegative: true, roundTo: 0 },
    depth2pct: { base: supplied * 0.05, driftMultiplier: 1.01, noise: 0.06, nonNegative: true, roundTo: 0 },
    volatility30d: { base: asset.category === "stable" ? 1.2 : 48, driftMultiplier: 0.98, noise: 0.12, nonNegative: true, roundTo: 2 },
    impermanentLoss: { base: 0.1, driftMultiplier: 1.04, noise: 0.3, nonNegative: true, roundTo: 2 },
    oraclePremium: { base: 0.08, driftMultiplier: 1.02, noise: 0.2, nonNegative: true, roundTo: 2 },
  }
  const out = {} as Record<KeyMetricId, Record<TimeRangeId, Series>>
  for (const id of ALL_KEY_METRICS) {
    out[id] = buildSeriesFamily(`${asset.id}:km:${id}`, id, shapes[id])
  }
  return out
}

function buildAssetCashflow(asset: BorrowableAsset, supplied: number, borrowed: number): CashflowCard {
  const annualInterest = borrowed * asset.borrowApr / 100
  const feesSeries = buildSeries(`${asset.id}:cf:interest`, "1Y", "Interest", { base: annualInterest / 12, driftMultiplier: 1.04, noise: 0.08, nonNegative: true, roundTo: 0 })
  const rewardsSeries = buildSeries(`${asset.id}:cf:rewards`, "1Y", "Rewards", { base: supplied * 0.002 / 12, driftMultiplier: 1.05, noise: 0.18, nonNegative: true, roundTo: 0 })
  return {
    bars: [feesSeries, rewardsSeries],
    periodLabel: "Last 12 months",
    rows: [
      { label: "Interest paid by borrowers", reported: formatCompactUsd(annualInterest), yoy: deltaFromPct(14.2), highlighted: true },
      { label: "To suppliers", reported: formatCompactUsd(annualInterest * 0.9), yoy: deltaFromPct(13.8) },
      { label: "Reserve", reported: formatCompactUsd(annualInterest * 0.1), yoy: deltaFromPct(16.4) },
      { label: "Rewards distributed", reported: formatCompactUsd(supplied * 0.002), yoy: deltaFromPct(4.1) },
      { label: "Net to suppliers", reported: formatCompactUsd(annualInterest * 0.9 + supplied * 0.002), yoy: deltaFromPct(12.8), highlighted: true },
    ],
  }
}

function buildCashflowTrend(asset: BorrowableAsset, _supplied: number, borrowed: number): CashflowTrend {
  const annualInterest = borrowed * (asset.borrowApr / 100)
  const monthlyGross = annualInterest / 12
  const rand = prngFromString(`${asset.id}:cf:trend`)
  const now = Date.UTC(2026, 3, 22)

  const points: Series["points"] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCMonth(d.getUTCMonth() - i, 1)
    const t = d.toISOString().slice(0, 10)
    const wave = 1 + Math.sin(((11 - i) / 11) * Math.PI * 2) * 0.18
    const noise = 1 + (rand() - 0.5) * 0.24
    const gross = Math.max(0, Math.round(monthlyGross * wave * noise))
    points.push({ t, v: gross })
  }

  const total = points.reduce((a, p) => a + p.v, 0)
  return {
    totalLabel: formatCompactUsd(total),
    periodLabel: "Yearly",
    series: {
      id: `${asset.id}:cf:revenue`,
      label: "Revenue",
      points,
      aggregate: total / 12,
    },
  }
}

function buildAssetEngagement(asset: BorrowableAsset, supplied: number, borrowed: number): EngagementTrend {
  const rand = prngFromString(`${asset.id}:engagement`)
  const base = Math.max(800, Math.round(Math.sqrt(supplied) * 1.6))
  const now = Date.UTC(2026, 3, 22)
  const samples = 12
  const points: Series["points"] = []
  for (let i = samples - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    const t = d.toISOString().slice(0, 10)
    const wave = 1 + Math.sin(((samples - 1 - i) / samples) * Math.PI * 2) * 0.22
    const noise = 1 + (rand() - 0.5) * 0.25
    const v = Math.max(0, Math.round(base * wave * noise))
    points.push({ t, v })
  }
  const last = points[points.length - 1].v
  const total = points.reduce((a, p) => a + p.v, 0)
  const repayRate = Math.max(40, Math.min(96, asset.utilization * 0.95 + rand() * 4))
  const active = deltaFromPct(Math.round((rand() * 14 + 3) * 10) / 10)
  const repay = deltaFromPct(Math.round((rand() * 4 - 1) * 10) / 10)
  return {
    title: "User Engagement Trends",
    primary: {
      label: "Active wallets",
      valueLabel: last.toLocaleString(),
      delta: active,
    },
    secondary: {
      label: "Repay conversion",
      valueLabel: `${repayRate.toFixed(1)}%`,
      delta: repay,
    },
    series: {
      id: `${asset.id}:engagement`,
      label: "Active wallets",
      points,
      aggregate: total / samples,
    },
  }
}

function buildAssetRisk(asset: BorrowableAsset, fixture: AssetFixture | undefined): RiskAssessment {
  if (fixture?.risk) return fixture.risk
  const isStable = asset.category === "stable"
  // Derive a unique bps per asset so every gauge shows a distinct score.
  // Base = category default, then shift by asset-specific signals:
  //   +utilization (higher utilization → higher premium)
  //   +borrowApr (higher rate → higher premium)
  //   ±seeded hash for deterministic spread across assets with similar stats.
  const base = isStable ? 28 : 110
  const utilAdj = (asset.utilization - 50) * (isStable ? 0.2 : 0.45)
  const aprAdj = (asset.borrowApr - (isStable ? 4 : 6)) * (isStable ? 1.4 : 2.2)
  const seed = prngFromString(`asset-risk:${asset.id}`)()
  const spread = (seed - 0.5) * (isStable ? 24 : 70)
  const bps = Math.max(8, Math.round(base + utilAdj + aprAdj + spread))
  const level = riskLevelFromBps(bps)
  return {
    premiumBps: bps,
    level,
    score: riskScoreFromBps(bps),
    headline: `${riskLevelLabel(level)} risk · ${formatBpsAsPct(bps)} premium`,
    summary: isStable
      ? `${asset.symbol} is a stablecoin. Primary risk is a de-peg or issuer-solvency event; monitored by oracle deviation guards.`
      : `${asset.symbol} is a volatile asset used for directional carry. Primary risk is realized volatility and oracle latency under stress.`,
    breakdown: isStable
      ? [
          { id: "depeg", label: "De-peg tail", bps: Math.round(bps * 0.5), level: "low", description: "Guardrails pause new borrows on >50bps deviation for 5m." },
          { id: "issuer", label: "Issuer solvency", bps: Math.round(bps * 0.3), level: "low", description: "Attestations / reserve reports monitored weekly." },
          { id: "bridge", label: "Bridge / wrapping", bps: Math.round(bps * 0.15), level: "low", description: "Only canonical bridges accepted." },
          { id: "sc", label: "Smart-contract surface", bps: Math.round(bps * 0.05), level: "low", description: "Standard ERC-20 implementations only." },
        ]
      : [
          { id: "vol", label: "Realized volatility", bps: Math.round(bps * 0.5), level, description: "30d σ relative to the category's target band." },
          { id: "oracle", label: "Oracle latency", bps: Math.round(bps * 0.2), level, description: "Chainlink feed + deviation guard." },
          { id: "depth", label: "Liquidity depth", bps: Math.round(bps * 0.15), level: "low", description: "Depth across routing venues." },
          { id: "sc", label: "Smart-contract surface", bps: Math.round(bps * 0.15), level: "low", description: "Token contract + wrapper if applicable." },
        ],
    metrics: [
      { id: "category", label: "Category", value: asset.category === "stable" ? "Stablecoin" : "Volatile" },
      { id: "borrowApr", label: "Borrow APY", value: `${asset.borrowApr.toFixed(2)}%` },
      { id: "utilization", label: "Utilization", value: `${asset.utilization.toFixed(1)}%` },
      { id: "available", label: "Available", value: formatCompactUsd(asset.availableUsd) },
    ],
  }
}

function buildAssetAbout(asset: BorrowableAsset, fixture: AssetFixture | undefined): AboutCard {
  if (fixture?.about) return fixture.about
  return {
    description:
      `${asset.name} (${asset.symbol}) is a core borrowable market in the protocol and a building block for both directional hedges and LP carry loops. ` +
      `${asset.subtitle} The borrow APY is influenced by utilization, reserve settings, and how often the asset is used as collateral elsewhere in the system, so the page focuses on the live rate, the supply/borrow mix, and the latest risk posture.`,
    stats: [],
    history: [
      { date: "2025-02-10", title: "Listed", description: `${asset.symbol} listed with conservative borrow cap.` },
      { date: "2025-11-18", title: "Parameters refreshed", description: "Quarterly risk review — no changes." },
    ],
  }
}

function buildRelated(asset: BorrowableAsset): RelatedAssetSummary[] {
  return BORROWABLE_ASSETS.filter((other) => other.id !== asset.id && other.category === asset.category)
    .slice(0, 4)
    .map((other) => ({
      id: other.id,
      name: other.name,
      symbol: other.symbol,
      visual: other.visual,
      aprLabel: `${other.borrowApr.toFixed(2)}%`,
      availableLabel: formatCompactUsd(other.availableUsd),
      utilizationPct: other.utilization,
    }))
}

function buildTransactions(asset: BorrowableAsset): TxHistoryRow[] {
  const rand = prngFromString(`${asset.id}:tx`)
  const kinds: TxHistoryRow["kind"][] = ["supply", "borrow", "repay", "withdraw", "rewards", "liquidation"]
  const out: TxHistoryRow[] = []
  const now = Date.UTC(2026, 3, 22)
  for (let i = 0; i < 12; i++) {
    const kind = kinds[Math.floor(rand() * kinds.length)]
    const amount = Math.round((10_000 + rand() * 240_000) / 100) * 100
    const at = new Date(now - i * 3 * 60 * 60 * 1000 - Math.floor(rand() * 86_400_000)).toISOString()
    out.push({
      id: `${asset.id}-tx-${i}`,
      at,
      kind,
      amountLabel: `${kind === "borrow" || kind === "withdraw" ? "-" : "+"}${formatCompactUsd(amount)}`,
      counterpartyLabel: kind === "liquidation" ? "Liquidator · 0x9a…3b" : undefined,
      txHashShort: `0x${Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0")}…${Math.floor(rand() * 0xffff).toString(16).padStart(4, "0")}`,
    })
  }
  return out
}

// -------------------------------------------------------------------------
// Public
// -------------------------------------------------------------------------

export function resolveAsset(id: string): BorrowableAsset | null {
  if (!id) return null
  return BORROWABLE_ASSETS.find((asset) => asset.id === id || asset.symbol.toLowerCase() === id.toLowerCase()) ?? null
}

export function buildAssetDetail(asset: BorrowableAsset): AssetDetail {
  const fixture = ASSET_FIXTURES[asset.id]
  const supplied = fixture?.baseSuppliedUsd ?? Math.max(asset.totalBorrowedUsd + asset.availableUsd, 1)
  const borrowed = fixture?.baseBorrowedUsd ?? asset.totalBorrowedUsd
  const allocation: AllocationRow[] = computeAssetAllocation(asset, BORROW_POOL_CATALOG)
  return {
    id: asset.id,
    hero: buildHero(asset, fixture),
    heroMetric: {
      metricId: "supply",
      valueLabel: formatCompactUsd(supplied),
      delta: deltaFromPct(2.1),
      series: buildHeroSeries(asset, supplied, borrowed),
    },
    quickStats: buildQuickStats(asset, supplied, borrowed, fixture),
    supplyBorrow: buildSupplyBorrow(asset, supplied, borrowed),
    interestGenerated: buildInterestGenerated(asset, borrowed),
    historicalUtilization: buildSeries(`${asset.id}:hist:util`, "1Y", "Utilization", {
      base: (borrowed / supplied) * 100,
      driftMultiplier: 1.02,
      noise: 0.08,
      nonNegative: true,
      roundTo: 2,
    }),
    cashflowTrend: buildCashflowTrend(asset, supplied, borrowed),
    allocation,
    keyMetrics: buildAssetKeyMetrics(asset, supplied, borrowed),
    cashflow: buildAssetCashflow(asset, supplied, borrowed),
    engagement: buildAssetEngagement(asset, supplied, borrowed),
    risk: buildAssetRisk(asset, fixture),
    about: buildAssetAbout(asset, fixture),
    transactions: buildTransactions(asset),
    related: buildRelated(asset),
    row: asset,
  }
}

for (const id of ALL_ASSET_CHART_METRICS) void id

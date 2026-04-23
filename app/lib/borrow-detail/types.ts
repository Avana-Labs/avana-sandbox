/**
 * Public types for the borrow / lend detail pages.
 *
 * These types model everything a detail page needs to render. The frontend
 * consumes these shapes via the public API in `./index.ts`; the mock layer
 * (`pool.mock.ts`, `asset.mock.ts`) is the only place that knows how the
 * numbers are produced today. When live data arrives the data seam swaps
 * implementations without changing the shapes — see `docs/borrow-detail-tests/HANDOFF.md`.
 */

import type { BorrowAssetVisual, BorrowPoolRow, BorrowableAsset } from "@/app/lib/borrow-sim"

// -------------------------------------------------------------------------
// Primitive building blocks
// -------------------------------------------------------------------------

/** A single (t, v) sample on a time-series chart. */
export type Point = {
  /** ISO-8601 date (YYYY-MM-DD) or an ISO timestamp. */
  t: string
  v: number
}

/** A named series of points (used by every chart primitive). */
export type Series = {
  id: string
  label: string
  points: Point[]
  /**
   * Optional aggregate value the series is summarized by (e.g. the number
   * displayed above the chart when this series is active).
   */
  aggregate?: number
  /** Optional unit used by formatters, e.g. "$" | "%" | "ETH". */
  unit?: string
}

export type ChangeDirection = "up" | "down" | "flat"

export type DeltaStat = {
  value: number
  direction: ChangeDirection
  /** Pre-formatted label e.g. "+2.4%" or "-$1.2M". */
  label: string
}

// -------------------------------------------------------------------------
// Risk
// -------------------------------------------------------------------------

/** Qualitative risk bucket for pools/assets — drives the gauge + pill. */
export type RiskLevel = "low" | "moderate" | "elevated" | "high"

/** Single-factor breakdown contributing to the overall Risk Premium. */
export type RiskBreakdownItem = {
  id: string
  /** Short factor title e.g. "Oracle", "Liquidity depth", "Volatility". */
  label: string
  /** Score in bps this factor contributes to the total risk premium. */
  bps: number
  /** Qualitative bucket for this single factor. */
  level: RiskLevel
  /** Plain-English explanation shown inside the accordion. */
  description: string
}

/** Single key/value metric shown in the risk card (e.g. "σ 30d", "$ depth"). */
export type RiskMetric = {
  id: string
  label: string
  value: string
  hint?: string
}

export type RiskAssessment = {
  /** Total risk premium in basis points (sum of breakdown items). */
  premiumBps: number
  /** Qualitative bucket derived from `premiumBps`. */
  level: RiskLevel
  /** Score 0..100 used to position the gauge needle. */
  score: number
  /** One-sentence summary shown next to the gauge. */
  headline: string
  /** A short paragraph explaining the rating. */
  summary: string
  /** Ordered list of contributing factors (rendered as accordion rows). */
  breakdown: RiskBreakdownItem[]
  /** Key quantitative inputs (depth, σ, dependencies, etc.). */
  metrics: RiskMetric[]
  /** Optional last-review date ISO string (when a committee last signed off). */
  lastReviewed?: string
}

// -------------------------------------------------------------------------
// Pool detail page
// -------------------------------------------------------------------------

export type TimeRangeId = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL"

export type ChartMetricId = "tvl" | "volume" | "fees" | "price"

export type KeyMetricId =
  | "tvl"
  | "volume"
  | "fees"
  | "feesApr"
  | "rewards"
  | "utilization"
  | "borrowApr"
  | "incentives"
  | "depth2pct"
  | "volatility30d"
  | "impermanentLoss"
  | "oraclePremium"

export type PerfTab = "fees" | "pnl" | "composition" | "incentives"
export type PerfPeriod = "weekly" | "monthly" | "quarterly"

export type PerfTabDataset = {
  /** Aggregate headline for the active period (e.g. "$142,800"). */
  headline: string
  /** Secondary label, e.g. "vs last period +12%". */
  subLabel?: string
  series: Series
  /** Breakdown rows rendered under the chart. */
  breakdown: Array<{ label: string; value: string; delta?: DeltaStat }>
}

export type CashflowRow = {
  label: string
  reported: string
  yoy?: DeltaStat
  highlighted?: boolean
}

export type CashflowCard = {
  bars: Series[]
  rows: CashflowRow[]
  /** Period the table is anchored to (displayed as a column header). */
  periodLabel: string
}

export type PoolDetailHero = {
  /** Token A/B visuals used for the big double-logo. */
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  /** Display name, e.g. "ETH / USDC". */
  name: string
  /** Short venue label, e.g. "Uniswap v3 · 0.3%". */
  venue: string
  /** Detailed description line shown under the name. */
  subtitle: string
  /** Fee tier label when applicable (e.g. "0.3%" or "Stable"). */
  feeTier?: string
  /** Chain / network tag (e.g. "Ethereum", "Arbitrum", "Base"). */
  chain: string
  /** Link to the source contract / external explorer. */
  explorerUrl?: string
}

export type QuickStat = {
  id: string
  label: string
  value: string
  delta?: DeltaStat
  tooltip?: string
}

export type AboutCard = {
  description: string
  stats: Array<{ label: string; value: string }>
  history: Array<{ date: string; title: string; description?: string }>
}

export type RelatedPoolSummary = {
  id: string
  name: string
  venue: string
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  aprLabel: string
  availableLabel: string
}

export type PoolDetail = {
  id: string
  hero: PoolDetailHero
  /** Headline metric and chart (replaces the giant TVL number). */
  heroMetric: {
    metricId: ChartMetricId
    valueLabel: string
    delta: DeltaStat
    /** Time-series per metric keyed by metric id. */
    series: Record<ChartMetricId, Record<TimeRangeId, Series>>
  }
  quickStats: QuickStat[]
  performance: Record<PerfTab, Record<PerfPeriod, PerfTabDataset>>
  keyMetrics: Record<KeyMetricId, Record<TimeRangeId, Series>>
  cashflow: CashflowCard
  risk: RiskAssessment
  about: AboutCard
  related: RelatedPoolSummary[]
  governanceNotes: Array<{ title: string; body: string; tone?: "info" | "warning" | "positive" }>
  /** Passthrough reference to the table row so sidebars can stay in sync. */
  row: BorrowPoolRow
}

// -------------------------------------------------------------------------
// Asset detail page
// -------------------------------------------------------------------------

export type AssetChartMetricId = "supply" | "borrow" | "utilization" | "apy"

export type AllocationRow = {
  id: string
  /** Pool name, e.g. "USDC / USDT". */
  poolName: string
  /** Venue label, e.g. "Uniswap v3". */
  venueLabel: string
  visuals: [BorrowAssetVisual, BorrowAssetVisual]
  sharePct: number
  valueUsd: number
  utilizationPct: number
  borrowAprPct: number
}

export type TxHistoryRow = {
  id: string
  /** ISO timestamp. */
  at: string
  kind: "supply" | "withdraw" | "borrow" | "repay" | "liquidation" | "rewards"
  amountLabel: string
  counterpartyLabel?: string
  txHashShort: string
}

export type AssetDetailHero = {
  visual: BorrowAssetVisual
  name: string
  symbol: string
  subtitle: string
  chain: string
  category: "stable" | "crypto"
}

export type RelatedAssetSummary = {
  id: string
  name: string
  symbol: string
  visual: BorrowAssetVisual
  aprLabel: string
  availableLabel: string
  utilizationPct: number
}

export type AssetDetail = {
  id: string
  hero: AssetDetailHero
  heroMetric: {
    metricId: AssetChartMetricId
    valueLabel: string
    delta: DeltaStat
    series: Record<AssetChartMetricId, Record<TimeRangeId, Series>>
  }
  quickStats: QuickStat[]
  supplyBorrow: {
    supplied: Series
    borrowed: Series
    utilization: Series
  }
  interestGenerated: Record<PerfPeriod, PerfTabDataset>
  historicalUtilization: Series
  allocation: AllocationRow[]
  keyMetrics: Record<KeyMetricId, Record<TimeRangeId, Series>>
  cashflow: CashflowCard
  risk: RiskAssessment
  about: AboutCard
  transactions: TxHistoryRow[]
  related: RelatedAssetSummary[]
  /** Passthrough reference so sidebars can stay in sync. */
  row: BorrowableAsset
}

// -------------------------------------------------------------------------
// Convenience guards
// -------------------------------------------------------------------------

export const ALL_TIME_RANGES: TimeRangeId[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"]
export const ALL_CHART_METRICS: ChartMetricId[] = ["tvl", "volume", "fees", "price"]
export const ALL_KEY_METRICS: KeyMetricId[] = [
  "tvl",
  "volume",
  "fees",
  "feesApr",
  "rewards",
  "utilization",
  "borrowApr",
  "incentives",
  "depth2pct",
  "volatility30d",
  "impermanentLoss",
  "oraclePremium",
]
export const ALL_PERF_TABS: PerfTab[] = ["fees", "pnl", "composition", "incentives"]
export const ALL_PERF_PERIODS: PerfPeriod[] = ["weekly", "monthly", "quarterly"]
export const ALL_ASSET_CHART_METRICS: AssetChartMetricId[] = ["supply", "borrow", "utilization", "apy"]

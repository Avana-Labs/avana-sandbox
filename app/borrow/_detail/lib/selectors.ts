/**
 * View-model selectors that project the raw data-layer types
 * (`PoolDetail` / `AssetDetail`) onto the props the primitives consume.
 *
 * Keeping this logic in pure, testable functions lets sections stay slim
 * and lets us swap the backing data without rewriting the UI layer.
 */

import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type {
  AssetDetail,
  ChartMetricId,
  KeyMetricId,
  PoolDetail,
  Series,
  TimeRangeId,
  AssetChartMetricId,
} from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import type { MetricChip } from "../ui/MetricChipRow"

export type PoolChartChip = MetricChip & { id: ChartMetricId }
export type KeyMetricChip = MetricChip & { id: KeyMetricId }
export type AssetChartChip = MetricChip & { id: AssetChartMetricId }

const POOL_CHART_LABELS: Record<ChartMetricId, string> = {
  tvl: "TVL",
  volume: "Volume",
  fees: "Fees",
  price: "Price",
}

const KEY_METRIC_LABELS: Record<KeyMetricId, string> = {
  tvl: "TVL",
  volume: "Volume",
  fees: "Fees",
  feesApr: "Fees APR",
  rewards: "Rewards",
  utilization: "Utilization",
  borrowApr: "Borrow APR",
  incentives: "Incentives",
  depth2pct: "Depth (±2%)",
  volatility30d: "Volatility 30d",
  impermanentLoss: "Impermanent loss",
  oraclePremium: "Oracle premium",
}

const ASSET_CHART_LABELS: Record<AssetChartMetricId, string> = {
  supply: "Supplied",
  borrow: "Borrowed",
  utilization: "Utilization",
  apy: "APY",
}

/**
 * Returns the hero chart tab chips for a pool, annotating each chip with a
 * compact hint pulled from the most recent point of the active range.
 */
export function poolHeroChips(detail: PoolDetail, range: TimeRangeId): PoolChartChip[] {
  return (Object.keys(POOL_CHART_LABELS) as ChartMetricId[]).map((id) => {
    const series = detail.heroMetric.series[id][range]
    const last = series.points[series.points.length - 1]?.v ?? 0
    return {
      id,
      label: POOL_CHART_LABELS[id],
      hint: id === "price" ? formatPrice(last) : formatCompactUsd(last),
    }
  })
}

/** Hero chips for the asset detail page. */
export function assetHeroChips(detail: AssetDetail, range: TimeRangeId): AssetChartChip[] {
  return (Object.keys(ASSET_CHART_LABELS) as AssetChartMetricId[]).map((id) => {
    const series = detail.heroMetric.series[id][range]
    const last = series.points[series.points.length - 1]?.v ?? 0
    return {
      id,
      label: ASSET_CHART_LABELS[id],
      hint: id === "utilization" || id === "apy" ? formatPct(last, 2) : formatCompactUsd(last),
    }
  })
}

/** Chips for the Key Metrics card (shared pattern for pool + asset). */
export function keyMetricChips(
  keyMetrics: Record<KeyMetricId, Record<TimeRangeId, Series>>,
  range: TimeRangeId,
): KeyMetricChip[] {
  return (Object.keys(KEY_METRIC_LABELS) as KeyMetricId[]).map((id) => {
    const series = keyMetrics[id][range]
    const last = series.points[series.points.length - 1]?.v ?? 0
    const hint = formatKeyMetric(id, last)
    return { id, label: KEY_METRIC_LABELS[id], hint }
  })
}

function formatKeyMetric(id: KeyMetricId, v: number): string {
  switch (id) {
    case "tvl":
    case "volume":
    case "fees":
    case "rewards":
    case "incentives":
    case "depth2pct":
      return formatCompactUsd(v)
    case "feesApr":
    case "utilization":
    case "borrowApr":
    case "volatility30d":
    case "impermanentLoss":
    case "oraclePremium":
      return formatPct(v, 2)
  }
}

function formatPrice(v: number): string {
  if (v >= 100) return `$${v.toFixed(2)}`
  if (v >= 1) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

/** Ordinal y-axis label formatter for a KeyMetric series. */
export function labelForKeyMetric(id: KeyMetricId): string {
  return KEY_METRIC_LABELS[id]
}

export function labelForPoolMetric(id: ChartMetricId): string {
  return POOL_CHART_LABELS[id]
}

export function labelForAssetMetric(id: AssetChartMetricId): string {
  return ASSET_CHART_LABELS[id]
}

/**
 * Extracts an 0x-prefixed EVM address from an explorer URL and returns both
 * the full lowercase address and a 0x1234…abcd display label. Uniswap-style
 * truncation: first 6 chars (including 0x) + ellipsis + last 4.
 */
export function truncateContract(explorerUrl?: string): { address: string; label: string } | null {
  if (!explorerUrl) return null
  const match = explorerUrl.match(/0x[a-fA-F0-9]{40}/)
  if (!match) return null
  const address = match[0]
  return { address, label: `${address.slice(0, 6)}…${address.slice(-4)}` }
}

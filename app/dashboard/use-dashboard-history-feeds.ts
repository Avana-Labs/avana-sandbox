"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { formatChartValue } from "@/app/components/charts"
import type { ChartFeed, ChartPoint, ChartRangeData, ChartRangeOption } from "@/app/components/charts/types"

/**
 * How wide each range is in ms. `All` bypasses filtering.
 * The buckets stay range-agnostic on the client — we simply drop points older
 * than the window so the chart resolution reflects what actually happened
 * inside it, rather than every range rendering the same series (E-M3).
 */
const RANGE_WINDOWS_MS: Record<Exclude<ChartRangeOption, "All">, number> = {
  "1D": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
}

const EMPTY_RANGE_DATA: ChartRangeData = {
  "1D": [],
  "1W": [],
  "1M": [],
  "3M": [],
  "1Y": [],
  All: [],
}

type PortfolioSnapshotRow = {
  at: number
  totalValueUsd: number
  totalSuppliedUsd: number
  totalBorrowedUsd: number
  totalMultiplyExposureUsd: number
  totalEarnedUsd: number
  availableToBorrowUsd: number
}

export type PortfolioHistoryMetricId = "netValue" | "supplied" | "borrowed" | "earned" | "multiplyExposure"

/**
 * Live client-computed value per metric. The stored Convex snapshots can sit on a
 * different (stale-seed) basis than the client's live headline, so each metric's
 * series is rebased/anchored to THIS live value — the same discipline the net-value
 * hero already applies. Without it the history chart shows a number that disagrees
 * with the headline right above it.
 */
export type LiveMetricValues = Record<PortfolioHistoryMetricId, number>

const METRIC_VALUE: Record<PortfolioHistoryMetricId, (row: PortfolioSnapshotRow) => number> = {
  netValue: (row) => row.totalValueUsd,
  supplied: (row) => row.totalSuppliedUsd,
  borrowed: (row) => row.totalBorrowedUsd,
  earned: (row) => row.totalEarnedUsd,
  multiplyExposure: (row) => row.totalMultiplyExposureUsd,
}

/**
 * If the newest stored snapshot for a metric sits more than this fraction away
 * from the live value, the whole stored series is treated as off-basis and we show
 * only the live point (a flat line at the correct number) instead of a misleading
 * jump. Same basis-tolerance discipline the portfolio feeds use.
 */
const BASIS_TOLERANCE = 0.25

/**
 * Slice `snapshots` to just the rows inside a given range window. Time-based,
 * anchored to the newest snapshot rather than `Date.now()` so a stale-but-still-
 * useful series doesn't render as empty when the wallet has been idle.
 */
export function sliceSnapshotsByRange<Row extends { at: number }>(snapshots: Row[], range: ChartRangeOption): Row[] {
  if (range === "All" || snapshots.length === 0) return snapshots
  const anchor = snapshots[snapshots.length - 1]!.at
  const windowMs = RANGE_WINDOWS_MS[range]
  const cutoff = anchor - windowMs
  const filtered = snapshots.filter((row) => row.at >= cutoff)
  // Always keep at least the newest point so a shorter range doesn't render blank.
  return filtered.length > 0 ? filtered : snapshots.slice(-1)
}

function toChartPoints<Row extends { at: number }>(snapshots: Row[], value: (row: Row) => number): ChartPoint[] {
  return snapshots.map((row, index) => ({
    time: index,
    value: value(row),
    label:
      index === snapshots.length - 1
        ? "Now"
        : new Date(row.at).toLocaleDateString([], { month: "short", day: "numeric" }),
  }))
}

function buildRangeData<Row extends { at: number }>(snapshots: Row[], value: (row: Row) => number): ChartRangeData {
  const chronological = [...snapshots].sort((a, b) => a.at - b.at)
  const ranges: ChartRangeData = { ...EMPTY_RANGE_DATA }
  for (const range of Object.keys(EMPTY_RANGE_DATA) as ChartRangeOption[]) {
    ranges[range] = toChartPoints(sliceSnapshotsByRange(chronological, range), value)
  }
  return ranges
}

function buildFeedFromRangeData(rangeData: ChartRangeData, valueFormat: ChartFeed["valueFormat"]): ChartFeed {
  const primary = rangeData.All
  const first = primary[0]?.value ?? 0
  const last = primary[primary.length - 1]?.value ?? 0
  const change = last - first
  const pct = first ? (change / first) * 100 : 0
  return {
    headlineValue: formatChartValue(valueFormat, last),
    headlineDelta: `${formatChartValue(valueFormat, Math.abs(change))} (${Math.abs(pct).toFixed(2)}%)`,
    deltaTone: change >= 0 ? "positive" : "negative",
    rangeData,
    valueFormat,
  }
}

function flatFeed(value: number, valueFormat: ChartFeed["valueFormat"]): ChartFeed {
  const point: ChartPoint = { time: 0, value, label: "Now" }
  const points = [point]
  return {
    headlineValue: formatChartValue(valueFormat, value),
    headlineDelta: `${formatChartValue(valueFormat, 0)} (0.00%)`,
    deltaTone: "positive",
    rangeData: {
      "1D": points,
      "1W": points,
      "1M": points,
      "3M": points,
      "1Y": points,
      All: points,
    },
    valueFormat,
  }
}

/**
 * Rebase one metric's stored series onto the live client value for that metric,
 * then bucket by range. Same discipline as the net-value hero: if the newest
 * stored point is off-basis (stale seed), show only the live value as a flat line
 * so the chart never contradicts the headline; otherwise shift the whole series
 * by a single constant offset so the delta reflects the REAL movement inside the
 * series rather than the stored-vs-live basis gap.
 */
function rebasedMetricFeed(
  snapshots: PortfolioSnapshotRow[],
  selectValue: (row: PortfolioSnapshotRow) => number,
  liveValue: number,
): ChartFeed {
  const liveAnchor = Number.isFinite(liveValue) ? Math.max(0, liveValue) : 0
  const chronological = [...snapshots].sort((a, b) => a.at - b.at)
  if (chronological.length === 0 || liveAnchor <= 0) {
    return flatFeed(liveAnchor, "usdCompact")
  }
  const newest = selectValue(chronological[chronological.length - 1]!)
  if (Math.abs(newest - liveAnchor) > liveAnchor * BASIS_TOLERANCE) {
    return flatFeed(liveAnchor, "usdCompact")
  }
  const offset = liveAnchor - newest
  const rebased = chronological.map((row) => ({ at: row.at, value: selectValue(row) + offset }))
  const ranges: ChartRangeData = { ...EMPTY_RANGE_DATA }
  for (const range of Object.keys(EMPTY_RANGE_DATA) as ChartRangeOption[]) {
    const sliced = sliceSnapshotsByRange(rebased, range)
    ranges[range] = sliced.map((row, index) => ({
      time: index,
      value: index === sliced.length - 1 ? liveAnchor : row.value,
      label:
        index === sliced.length - 1
          ? "Now"
          : new Date(row.at).toLocaleDateString([], { month: "short", day: "numeric" }),
    }))
  }
  return buildFeedFromRangeData(ranges, "usdCompact")
}

/**
 * Build a rebased, range-bucketed feed per metric, each anchored to its live
 * client value. This is what the portfolio hero's metric toggle consumes, so the
 * charted number always agrees with the headline shown above it.
 */
export function buildRebasedMetricFeeds(
  snapshots: PortfolioSnapshotRow[],
  live: LiveMetricValues,
): Record<PortfolioHistoryMetricId, ChartFeed> {
  const result = {} as Record<PortfolioHistoryMetricId, ChartFeed>
  for (const metric of Object.keys(METRIC_VALUE) as PortfolioHistoryMetricId[]) {
    result[metric] = rebasedMetricFeed(snapshots, METRIC_VALUE[metric], live[metric])
  }
  return result
}

/**
 * Hook feeding the portfolio hero's metric toggle. Reads the already-deployed
 * getPortfolio query (no new server function needed) and rebases each metric to
 * the live values the dashboard computes client-side.
 */
export function useDashboardMetricFeeds(walletId: string | undefined, live: LiveMetricValues) {
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  // `live` is a fresh object each render; depend on its numeric fields (not the
  // object identity) so the feeds only rebuild when a value actually changes.
  const { netValue, supplied, borrowed, earned, multiplyExposure } = live
  return useMemo(() => {
    const snapshots = (portfolio?.snapshots ?? []) as PortfolioSnapshotRow[]
    return buildRebasedMetricFeeds(snapshots, { netValue, supplied, borrowed, earned, multiplyExposure })
  }, [portfolio?.snapshots, netValue, supplied, borrowed, earned, multiplyExposure])
}

/** WAD (1e18) → number for the health-factor plot. `null` rows drop out entirely. */
function wadToNumber(value: string | null): number | null {
  if (value == null) return null
  try {
    const asBig = BigInt(value)
    return Number(asBig) / 1e18
  } catch {
    return null
  }
}

/**
 * Build a health-factor time series from `riskSnapshots`. `null` HF rows (no
 * outstanding debt at that moment) are dropped so the plot doesn't dip to zero
 * on a repaid position — that's a debt-free window, not a risk collapse. Values
 * are plain HF ratios (1.60), formatted with the "ratio" chart format.
 */
export function buildRiskSeriesFeed(rows: ReadonlyArray<{ at: number; healthFactorWad: string | null }>): ChartFeed {
  const points = rows
    .map((row) => ({ at: row.at, value: wadToNumber(row.healthFactorWad) }))
    .filter((entry): entry is { at: number; value: number } => entry.value != null)
  const rangeData = buildRangeData(points, (row) => row.value)
  return buildFeedFromRangeData(rangeData, "ratio")
}

/**
 * Hook feeding the "Health factor over time" chart in the borrow account health
 * section. Reads the getRiskSeries query (E-M2) and maps it to an HF-ratio feed.
 * `pointCount` lets the caller render nothing until there's real risk history.
 */
export function useHealthFactorHistory(walletId: string | undefined) {
  const riskSeries = useQuery(api.sandbox.transactions.getRiskSeries, walletId ? { wallet: walletId } : "skip")
  return useMemo(() => {
    const rows = riskSeries ?? []
    return {
      feed: buildRiskSeriesFeed(rows),
      pointCount: rows.filter((row) => row.healthFactorWad != null).length,
    }
  }, [riskSeries])
}

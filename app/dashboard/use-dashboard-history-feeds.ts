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

const METRIC_VALUE: Record<PortfolioHistoryMetricId, (row: PortfolioSnapshotRow) => number> = {
  netValue: (row) => row.totalValueUsd,
  supplied: (row) => row.totalSuppliedUsd,
  borrowed: (row) => row.totalBorrowedUsd,
  earned: (row) => row.totalEarnedUsd,
  multiplyExposure: (row) => row.totalMultiplyExposureUsd,
}

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

/**
 * Build a `ChartFeed` for each portfolio metric from a shared snapshot series,
 * with range-aware bucketing applied per metric. All metrics share the same
 * time axis (they all come from the same snapshot row), just picking different
 * value fields.
 */
export function buildPortfolioMetricFeeds(
  snapshots: PortfolioSnapshotRow[],
): Record<PortfolioHistoryMetricId, ChartFeed> {
  const result = {} as Record<PortfolioHistoryMetricId, ChartFeed>
  for (const metric of Object.keys(METRIC_VALUE) as PortfolioHistoryMetricId[]) {
    const rangeData = buildRangeData(snapshots, METRIC_VALUE[metric])
    result[metric] = buildFeedFromRangeData(rangeData, "usdCompact")
  }
  return result
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
 * on a repaid position — that's a debt-free window, not a risk collapse.
 */
export function buildRiskSeriesFeed(rows: ReadonlyArray<{ at: number; healthFactorWad: string | null }>): ChartFeed {
  const points = rows
    .map((row) => ({ at: row.at, value: wadToNumber(row.healthFactorWad) }))
    .filter((entry): entry is { at: number; value: number } => entry.value != null)
  const rangeData = buildRangeData(points, (row) => row.value)
  return buildFeedFromRangeData(rangeData, "percent")
}

/**
 * Hook. Returns the per-metric portfolio feeds + a health-factor feed for a
 * wallet, all subscribing to Convex reactively. Skipping the queries when the
 * caller has no wallet keeps this safe in the pre-hydration render.
 */
export function useDashboardHistoryFeeds(walletId: string | undefined) {
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  const riskSeries = useQuery(api.sandbox.transactions.getRiskSeries, walletId ? { wallet: walletId } : "skip")

  return useMemo(() => {
    const snapshots = (portfolio?.snapshots ?? []) as PortfolioSnapshotRow[]
    return {
      portfolio: buildPortfolioMetricFeeds(snapshots),
      risk: buildRiskSeriesFeed(riskSeries ?? []),
      snapshotCount: snapshots.length,
      riskPointCount: riskSeries?.length ?? 0,
    }
  }, [portfolio?.snapshots, riskSeries])
}

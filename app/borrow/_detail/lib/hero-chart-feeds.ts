import { formatChartValue, type ChartFeed, type ChartRangeData, type ChartValueFormat } from "@/app/components/charts"
import type { Series, TimeRangeId } from "@/app/lib/borrow-detail"

const RANGE_MAP = {
  "1D": "1D",
  "1W": "1W",
  "1M": "1M",
  "3M": "3M",
  "1Y": "1Y",
  ALL: "All",
} as const

type BorrowRangeId = keyof typeof RANGE_MAP

export function buildFeedFromSeries(series: Series, valueFormat: ChartValueFormat, fallback: ChartFeed): ChartFeed {
  const points = series.points.map((point) => ({
    time: Date.parse(point.t),
    value: point.v,
    label: formatPointLabel(point.t),
  }))
  const latest = series.aggregate ?? points[points.length - 1]?.value ?? 0
  const first = points[0]?.value ?? latest
  const pct = first ? ((latest - first) / first) * 100 : 0

  return {
    headlineValue: formatChartValue(valueFormat, latest),
    headlineDelta: `${Math.abs(pct).toFixed(2)}%`,
    deltaTone: pct < 0 ? "negative" : "positive",
    rangeData: makeRangeData(points.length ? points : fallback.rangeData["1D"]),
    valueFormat,
  }
}

export function buildFeedFromRangeSeries(
  seriesByRange: Record<TimeRangeId, Series>,
  valueFormat: ChartValueFormat,
  fallback: ChartFeed,
): ChartFeed {
  const rangeData = Object.entries(RANGE_MAP).reduce((accumulator, [borrowRange, chartRange]) => {
    const series = seriesByRange[borrowRange as BorrowRangeId]
    accumulator[chartRange] =
      series?.points.map((point) => ({
        time: Date.parse(point.t),
        value: point.v,
        label: formatPointLabel(point.t),
      })) ?? fallback.rangeData[chartRange]
    return accumulator
  }, {} as ChartRangeData)
  const active = rangeData["1D"]?.length ? rangeData["1D"] : fallback.rangeData["1D"]
  const latest = active[active.length - 1]?.value ?? 0
  const first = active[0]?.value ?? latest
  const pct = first ? ((latest - first) / first) * 100 : 0

  return {
    headlineValue: formatChartValue(valueFormat, latest),
    headlineDelta: `${Math.abs(pct).toFixed(2)}%`,
    deltaTone: pct < 0 ? "negative" : "positive",
    rangeData,
    valueFormat,
  }
}

export function shortenAddressFromUrl(url?: string): string | null {
  if (!url) return null
  const match = url.match(/0x[a-fA-F0-9]{40}/)
  if (!match) return null
  const value = match[0]
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

function makeRangeData(points: ChartFeed["rangeData"]["1D"]): ChartRangeData {
  return {
    "1D": points,
    "1W": points.slice(-7),
    "1M": points.slice(-30),
    "3M": points.slice(-90),
    "1Y": points.slice(-365),
    All: points,
  }
}

function formatPointLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

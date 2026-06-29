"use client"

import { useMemo, useState } from "react"
import { resolveSeriesChange, resolveSeriesTone } from "./chart-data"
import { ChartRangeSelector } from "./chart-range-selector"
import { formatChartAxis, formatChartValue } from "./format"
import { HeroAreaChart } from "./hero-area-chart"
import { HeroBalanceDisplay } from "./hero-balance-display"
import type { ChartFeed, ChartRangeOption } from "./types"

type MarketHeroChartProps = {
  feed: ChartFeed
  defaultRange?: ChartRangeOption
  /** Hide the headline value (used for privacy toggles on the portfolio). */
  hideValue?: boolean
  height?: number
  gradientId?: string
  /** Small uppercase label naming the metric (e.g. "Total borrows"). */
  label?: string
}

/**
 * The universal hero chart used across portfolio, pool, and asset pages.
 * Give it a `ChartFeed` (from `app/lib/chart-feeds`) and it renders the
 * balance, the area chart, and the range selector — with hover-to-inspect.
 */
export function MarketHeroChart({
  feed,
  defaultRange = "1D",
  hideValue = false,
  height,
  gradientId = "marketHeroFill",
  label,
}: MarketHeroChartProps) {
  const [activeRange, setActiveRange] = useState<ChartRangeOption>(defaultRange)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const points = feed.rangeData[activeRange]

  const hoverPoint = hoverIndex != null ? points[hoverIndex] : null

  // The chart color and the headline delta both follow the active range's
  // real trend (first → last), so a dip shows red everywhere.
  const rangeTone = resolveSeriesTone(points)

  const { value, delta, meta, tone } = useMemo(() => {
    if (hoverPoint) {
      const first = points[0]?.value ?? hoverPoint.value
      const pct = first ? ((hoverPoint.value - first) / first) * 100 : 0
      return {
        value: formatChartValue(feed.valueFormat, hoverPoint.value),
        delta: `${Math.abs(pct).toFixed(2)}%`,
        meta: hoverPoint.label,
        tone: pct >= 0 ? ("positive" as const) : ("negative" as const),
      }
    }
    const change = resolveSeriesChange(points)
    return {
      value: feed.headlineValue,
      delta: `${formatChartValue(feed.valueFormat, change.changeAbs)} (${Math.abs(change.pct).toFixed(2)}%)`,
      meta: feed.headlineMeta,
      tone: rangeTone,
    }
  }, [feed, hoverPoint, points, rangeTone])

  return (
    <div className="space-y-3 sm:space-y-4">
      <HeroBalanceDisplay value={value} delta={delta} deltaTone={tone} meta={meta} hidden={hideValue} label={label} />
      <HeroAreaChart
        data={points}
        activeRange={activeRange}
        height={height}
        gradientId={gradientId}
        tone={hoverPoint ? tone : rangeTone}
        formatValue={(v) => formatChartValue(feed.valueFormat, v)}
        formatYAxis={(v) => formatChartAxis(feed.valueFormat, v)}
        onActiveIndexChange={setHoverIndex}
      />
      <ChartRangeSelector activeRange={activeRange} onRangeChange={setActiveRange} />
    </div>
  )
}

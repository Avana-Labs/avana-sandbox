"use client"

import { useMemo, useState } from "react"
import { ChartRangeSelector } from "./chart-range-selector"
import { HeroAreaChart } from "./hero-area-chart"
import type { ChartRangeData, ChartRangeOption } from "./types"

type HeroChartSectionProps = {
  rangeData: ChartRangeData
  defaultRange?: ChartRangeOption
  activeRange?: ChartRangeOption
  onRangeChange?: (range: ChartRangeOption) => void
  height?: number
  formatValue?: (value: number) => string
  formatYAxis?: (value: number) => string
  gradientId?: string
  tone?: "positive" | "negative"
}

export function HeroChartSection({
  rangeData,
  defaultRange = "1D",
  activeRange: controlledRange,
  onRangeChange,
  height,
  formatValue,
  formatYAxis,
  gradientId,
  tone,
}: HeroChartSectionProps) {
  const [internalRange, setInternalRange] = useState<ChartRangeOption>(defaultRange)
  const activeRange = controlledRange ?? internalRange

  const handleRangeChange = (range: ChartRangeOption) => {
    if (controlledRange === undefined) {
      setInternalRange(range)
    }
    onRangeChange?.(range)
  }

  const chartData = useMemo(() => rangeData[activeRange], [activeRange, rangeData])

  return (
    <div className="space-y-3 sm:space-y-4">
      <HeroAreaChart
        data={chartData}
        activeRange={activeRange}
        height={height}
        formatValue={formatValue}
        formatYAxis={formatYAxis}
        gradientId={gradientId}
        tone={tone}
      />
      <ChartRangeSelector activeRange={activeRange} onRangeChange={handleRangeChange} />
    </div>
  )
}

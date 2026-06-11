"use client"

import { CHART_RANGE_OPTIONS, type ChartRangeOption } from "./types"

type ChartRangeSelectorProps = {
  activeRange: ChartRangeOption
  onRangeChange: (range: ChartRangeOption) => void
  className?: string
}

export function ChartRangeSelector({ activeRange, onRangeChange, className }: ChartRangeSelectorProps) {
  return (
    <div
      className={
        className ??
        "flex w-full items-center justify-between gap-0.5 rounded-full border border-border bg-background p-1 sm:inline-flex sm:w-auto sm:justify-start sm:border-transparent sm:bg-[#f5f5f5] dark:sm:bg-surface-raised"
      }
    >
      {CHART_RANGE_OPTIONS.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onRangeChange(range)}
          className={`flex-1 rounded-full px-2 py-1.5 text-[12px] font-medium transition-colors sm:flex-none sm:px-3.5 sm:py-1.5 sm:text-[13px] ${
            activeRange === range
              ? "bg-[#f0f0f0] text-foreground sm:bg-white sm:shadow-[0_1px_2px_rgba(15,23,42,0.08)] dark:sm:bg-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  )
}

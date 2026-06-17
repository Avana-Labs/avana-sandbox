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
        "flex w-full items-center justify-between gap-0.5 rounded-full border border-[#e5e5e5] bg-white p-0.5 sm:inline-flex sm:w-auto sm:justify-start dark:border-border dark:sm:bg-surface-raised"
      }
    >
      {CHART_RANGE_OPTIONS.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onRangeChange(range)}
          className={`flex-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors sm:flex-none sm:px-3.5 sm:py-1 sm:text-[13px] ${
            activeRange === range
              ? "bg-[#ececec] text-[#313131] sm:bg-[#e9e9e9] sm:shadow-none dark:bg-[#1f2937] dark:text-foreground dark:sm:bg-background"
              : "text-[#6a6a6a] hover:text-[#313131] dark:text-[#a3a3a3] dark:hover:text-foreground"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  )
}

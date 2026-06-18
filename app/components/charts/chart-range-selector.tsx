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
        "flex w-full items-center justify-between gap-0.5 rounded-full border border-[#e5e5e5] bg-white p-0.5 sm:inline-flex sm:w-auto sm:justify-start dark:border-slate-800 dark:bg-slate-950"
      }
    >
      {CHART_RANGE_OPTIONS.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onRangeChange(range)}
          className={`flex min-h-10 flex-1 items-center justify-center rounded-full px-2.5 py-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0 sm:flex-none sm:px-3.5 sm:py-1 sm:text-[13px] ${
            activeRange === range
              ? "bg-[#ececec] text-[#313131] sm:bg-[#e9e9e9] sm:shadow-none dark:bg-slate-100 dark:text-slate-950"
              : "text-[#6a6a6a] hover:text-[#313131] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  )
}

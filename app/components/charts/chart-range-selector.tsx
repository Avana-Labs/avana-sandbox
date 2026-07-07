"use client"

import { cn } from "@/lib/utils"
import { CHART_RANGE_OPTIONS, type ChartRangeOption } from "./types"

type ChartRangeSelectorProps = {
  activeRange: ChartRangeOption
  onRangeChange: (range: ChartRangeOption) => void
  className?: string
  /** Ranges to render. Defaults to all; pass a subset to hide ranges without real data. */
  ranges?: readonly ChartRangeOption[]
}

/** "All" renders as "ALL" to match the uppercase tick labels. */
function formatRangeLabel(range: ChartRangeOption): string {
  return range === "All" ? "ALL" : range
}

export function ChartRangeSelector({ activeRange, onRangeChange, className, ranges = CHART_RANGE_OPTIONS }: ChartRangeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className={cn("flex w-full items-stretch justify-start gap-5 border-b border-border sm:gap-6", className)}
    >
      {ranges.map((range) => {
        const active = activeRange === range
        return (
          <button
            key={range}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onRangeChange(range)}
            className={cn(
              "relative flex min-h-10 flex-none items-center justify-center pb-2.5 pt-1 text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-0 sm:text-sm",
              active ? "text-sky-400" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {formatRangeLabel(range)}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -bottom-px left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-sky-400 transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

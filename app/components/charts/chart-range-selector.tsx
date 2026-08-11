"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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

export function ChartRangeSelector({
  activeRange,
  onRangeChange,
  className,
  ranges = CHART_RANGE_OPTIONS,
}: ChartRangeSelectorProps) {
  const { t } = useTranslation()
  return (
    <div
      role="tablist"
      aria-label={t("Time range")}
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm",
        className,
      )}
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
              "relative flex h-7 min-w-9 flex-none items-center justify-center rounded-full px-2.5 text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-[13px]",
              active ? "bg-muted text-foreground" : "text-foreground/75 hover:text-foreground",
            )}
          >
            {formatRangeLabel(range)}
          </button>
        )
      })}
    </div>
  )
}

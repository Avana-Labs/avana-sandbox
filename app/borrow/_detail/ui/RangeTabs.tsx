"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { TimeRangeId } from "@/app/lib/borrow-detail"

const ALL: TimeRangeId[] = ["1D", "1M", "3M", "1Y", "ALL"]

function formatRangeLabel(range: TimeRangeId) {
  return range === "ALL" ? "All" : range
}

type RangeTabsProps = {
  value: TimeRangeId
  onChange: (value: TimeRangeId) => void
  ranges?: TimeRangeId[]
  className?: string
  /** Visible name for accessibility; rendered as aria-label on the tab list. */
  ariaLabel?: string
}

export function RangeTabs({ value, onChange, ranges = ALL, className, ariaLabel = "Time range" }: RangeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5 dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      {ranges.map((r) => {
        const active = r === value
        return (
          <button
            key={r}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(r)}
            className={cn(
              "min-h-10 rounded-xs px-2.5 text-[11px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-6 sm:px-2",
              active
                ? "bg-surface-raised text-foreground shadow-elev-1 dark:bg-slate-100 dark:text-slate-950"
                : "text-muted-foreground hover:bg-hover hover:text-foreground dark:text-slate-300",
            )}
          >
            {formatRangeLabel(r)}
          </button>
        )
      })}
    </div>
  )
}

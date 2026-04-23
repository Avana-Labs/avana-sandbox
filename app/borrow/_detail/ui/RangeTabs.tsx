"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { TimeRangeId } from "@/app/lib/borrow-detail"

const ALL: TimeRangeId[] = ["1D", "1M", "3M", "1Y", "ALL"]

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
        "inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5",
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
              "h-6 rounded-[3px] px-2 text-[11px] font-medium tabular-nums transition-colors",
              active
                ? "bg-surface-raised text-foreground shadow-elev-1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        )
      })}
    </div>
  )
}

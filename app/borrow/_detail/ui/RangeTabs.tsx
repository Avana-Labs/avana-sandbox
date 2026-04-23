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
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5",
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
              "h-7 rounded-full px-2.5 text-xs font-semibold tabular-nums transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
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

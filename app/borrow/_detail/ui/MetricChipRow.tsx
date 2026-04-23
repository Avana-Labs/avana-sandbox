"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type MetricChip = {
  id: string
  label: string
  /** Short secondary label (e.g. "$312M" / "+2.4%"). */
  hint?: string
}

type MetricChipRowProps<T extends string> = {
  chips: Array<MetricChip & { id: T }>
  value: T
  onChange: (value: T) => void
  className?: string
  ariaLabel?: string
  variant?: "pills" | "cards"
}

export function MetricChipRow<T extends string>({
  chips,
  value,
  onChange,
  className,
  ariaLabel = "Metric",
  variant = "pills",
}: MetricChipRowProps<T>) {
  if (variant === "cards") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
          className,
        )}
      >
        {chips.map((chip) => {
          const active = chip.id === value
          return (
            <button
              key={chip.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(chip.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                active
                  ? "border-border/80 bg-muted/40 shadow-sm"
                  : "border-transparent bg-transparent hover:bg-muted/20",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">{chip.label}</span>
              {chip.hint ? (
                <span
                  className={cn(
                    "font-data text-base font-medium tabular-nums",
                    active ? "text-foreground" : "text-foreground/80",
                  )}
                >
                  {chip.hint}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      {chips.map((chip) => {
        const active = chip.id === value
        return (
          <button
            key={chip.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors",
              active
                ? "border-border/80 bg-muted/50 text-foreground"
                : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/20 hover:text-foreground",
            )}
          >
            <span>{chip.label}</span>
            {chip.hint ? (
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  active ? "text-foreground/70" : "text-muted-foreground/70",
                )}
              >
                {chip.hint}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

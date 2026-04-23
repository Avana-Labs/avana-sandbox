"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DeltaStat } from "@/app/lib/borrow-detail"

type GrowthCellProps = {
  delta: DeltaStat
  className?: string
  /** When `up` is "good" set to "up" (default). Flip for expense rows. */
  goodDirection?: "up" | "down"
}

export function GrowthCell({ delta, className, goodDirection = "up" }: GrowthCellProps) {
  const isGood = delta.direction === goodDirection
  const isFlat = delta.direction === "flat"
  const tone = isFlat
    ? "text-muted-foreground"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400"
  return (
    <span
      className={cn("inline-flex items-center gap-1 font-data text-xs font-semibold tabular-nums", tone, className)}
      aria-label={`Change ${delta.label}`}
    >
      {delta.label}
    </span>
  )
}

type GrowthCellsProps = {
  items: Array<{ id: string; label: string; delta: DeltaStat }>
  className?: string
}

export function GrowthCells({ items, className }: GrowthCellsProps) {
  return (
    <ul className={cn("flex flex-wrap gap-x-6 gap-y-2", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{item.label}</span>
          <GrowthCell delta={item.delta} />
        </li>
      ))}
    </ul>
  )
}

"use client"

import { cn } from "@/lib/utils"
import type { CategoryChip } from "@/app/lib/markets/category"

/**
 * Horizontal, single-select category filter chips (BTC / ETH / Forex / Utility / Smart
 * + All) used across Lend / Borrow / Multiply. Scrolls horizontally on mobile so the
 * row never wraps or pushes the layout.
 */
export function CategoryChips({
  chips,
  value,
  onChange,
  className,
}: {
  chips: readonly CategoryChip[]
  value: CategoryChip["id"]
  onChange: (id: CategoryChip["id"]) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      className={cn("flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
    >
      {chips.map((chip) => {
        const active = chip.id === value
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(chip.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-foreground text-background"
                : "bg-surface-inset text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

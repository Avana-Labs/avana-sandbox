"use client"

import { cn } from "@/lib/utils"
import type { CategoryChip } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
  const { t } = useTranslation()
  return (
    <div
      role="tablist"
      aria-label={t("Filter by category")}
      className={cn("flex items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
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
              "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-medium transition-colors",
              active
                ? "border-transparent bg-surface-inset text-foreground dark:bg-[#2c2c2c] dark:text-white"
                : "border-border bg-card text-muted-foreground hover:bg-surface-hover hover:text-foreground dark:border-transparent dark:bg-[#1d1d1d] dark:text-white/65 dark:hover:text-white",
            )}
          >
            {t(chip.label)}
          </button>
        )
      })}
    </div>
  )
}

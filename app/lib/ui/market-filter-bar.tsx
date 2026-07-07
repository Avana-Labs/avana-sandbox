"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { CategoryChips } from "./category-chips"
import type { CategoryChip } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-[18px]", className)}>
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-4", className)}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const FIELD_CLASSES =
  "flex h-9 items-center gap-2.5 rounded-full border border-[#e6e6e6] bg-[#fafafa] px-3.5 text-[#767676] shadow-none transition-colors focus-within:border-foreground/20 hover:bg-[#f3f3f3] dark:border-border/60 dark:bg-surface-2 dark:text-muted-foreground dark:hover:bg-surface-hover dark:focus-within:border-brand/30"

const INPUT_CLASSES =
  "min-w-0 flex-1 bg-transparent text-[14px] font-normal tracking-[-0.01em] outline-none placeholder:text-[#767676] dark:text-[#e6f8fb] dark:placeholder:text-muted-foreground/70"

/**
 * Unified market filter row shared by Lend / Borrow / Multiply so all three read
 * identically. Desktop: category chips (flex-1) + an always-open search bar styled
 * like the header. Mobile: chips scroll in a single compact row next to a search
 * icon; tapping the icon swaps the row for a full-width search field, so the filter
 * never costs more than one row of height.
 */
export function MarketFilterBar({
  chips,
  tab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder,
  className,
}: {
  chips: readonly CategoryChip[]
  tab: CategoryChip["id"]
  onTabChange: (id: CategoryChip["id"]) => void
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  className?: string
}) {
  const { t } = useTranslation()
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (mobileSearchOpen) mobileInputRef.current?.focus()
  }, [mobileSearchOpen])

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: chips + open search */}
      <div className="hidden items-center gap-4 md:flex">
        <div className="min-w-0 flex-1">
          <CategoryChips chips={chips} value={tab} onChange={onTabChange} />
        </div>
        <label className={cn(FIELD_CLASSES, "w-[240px] shrink-0 lg:h-10 lg:w-[280px] lg:gap-3 lg:px-4")}>
          <SearchIcon className="shrink-0 text-[#8a8a8a] dark:text-muted-foreground/80" />
          <input
            aria-label={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className={cn(INPUT_CLASSES, "lg:text-[15px]")}
          />
        </label>
      </div>

      {/* Mobile: compact single row — chips + search icon, or a full-width field */}
      <div className="md:hidden">
        {mobileSearchOpen ? (
          <label className={cn(FIELD_CLASSES, "w-full")}>
            <SearchIcon className="shrink-0 text-[#8a8a8a] dark:text-muted-foreground/80" />
            <input
              ref={mobileInputRef}
              aria-label={searchPlaceholder}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className={INPUT_CLASSES}
            />
            <button
              type="button"
              aria-label={t("Close search")}
              onClick={() => setMobileSearchOpen(false)}
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
            >
              <CloseIcon />
            </button>
          </label>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategoryChips chips={chips} value={tab} onChange={onTabChange} />
            </div>
            <button
              type="button"
              aria-label={searchPlaceholder}
              onClick={() => setMobileSearchOpen(true)}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e6e6e6] bg-[#fafafa] text-[#8a8a8a] transition-colors dark:border-border/60 dark:bg-surface-2 dark:text-muted-foreground",
                search.length > 0 && "border-brand/50 text-brand dark:border-brand/50 dark:text-brand",
              )}
            >
              <SearchIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

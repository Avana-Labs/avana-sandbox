"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { CategoryChips } from "@/app/lib/ui/category-chips"
import { CATEGORY_CHIPS, type CategoryChip } from "@/app/lib/markets/category"
import { cn } from "@/lib/utils"

// Category ids are the shared taxonomy (all / btc / eth / forex / utility / smart)
// so Borrow, Lend and Multiply filter with one component and one id space.
export const POOL_TAB_IDS = ["all", "btc", "eth", "forex", "utility", "smart"] as const

export type PoolTabId = (typeof POOL_TAB_IDS)[number]

export type BorrowTabId = PoolTabId

export function isPoolTab(tab: BorrowTabId): tab is PoolTabId {
  return POOL_TAB_IDS.includes(tab as PoolTabId)
}

export type TabsBarProps = {
  currentTab: BorrowTabId
  onTabChange: (tab: BorrowTabId) => void
  search: string
  onSearchChange: (value: string) => void
}

const CATEGORY_TABS: readonly CategoryChip[] = CATEGORY_CHIPS.borrow

function SearchIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-6 text-brand", className)}>
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

// Desktop search: expanded by default, styled to match the header search bar
// (rounded-full, soft off-white / dark surface, muted icon) in both themes.
function DesktopSearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
  const { t } = useTranslation()

  return (
    <label className="hidden h-9 w-[240px] items-center gap-2.5 rounded-full border border-[#e6e6e6] bg-[#fafafa] px-3.5 text-[#767676] shadow-none transition-colors focus-within:border-foreground/20 hover:bg-[#f3f3f3] md:flex lg:h-10 lg:w-[280px] lg:gap-3 lg:px-4 dark:border-border/60 dark:bg-surface-2 dark:text-muted-foreground dark:hover:bg-surface-hover dark:focus-within:border-brand/30">
      <SearchIcon className="size-[18px] shrink-0 text-[#8a8a8a] dark:text-muted-foreground/80" />
      <input
        aria-label={t("Filter assets")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("Search markets")}
        className="min-w-0 flex-1 bg-transparent text-[14px] font-normal tracking-[-0.01em] outline-none placeholder:text-[#767676] dark:text-[#e6f8fb] dark:placeholder:text-muted-foreground/70 lg:text-[15px]"
      />
    </label>
  )
}

export function TabsBar({
  currentTab,
  onTabChange,
  search,
  onSearchChange,
}: TabsBarProps) {
  const { t } = useTranslation()

  return (
    <div className="z-30">
      <div className="hidden items-center gap-4 py-7 md:flex">
        <div className="min-w-0 flex-1">
          <CategoryChips chips={CATEGORY_TABS} value={currentTab} onChange={onTabChange} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DesktopSearchBar value={search} onChange={onSearchChange} />
        </div>
      </div>

      <div className="py-2.5 md:hidden">
        <div className="flex items-center gap-2">
          <label className="flex h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-border/60 dark:text-[#e6f8fb] dark:focus-within:border-brand/30">
            <SearchIcon className="dark:text-brand" />
            <input
              aria-label={t("Filter assets")}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("Search markets")}
              className="w-full min-w-0 bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none dark:text-[#e6f8fb] dark:placeholder:text-muted-foreground/45"
            />
          </label>
        </div>

        <CategoryChips chips={CATEGORY_TABS} value={currentTab} onChange={onTabChange} className="mt-2.5" />
      </div>
    </div>
  )
}

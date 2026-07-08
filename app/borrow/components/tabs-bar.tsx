"use client"

import { useTranslation } from "@/app/lib/i18n/use-translation"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, type CategoryChip } from "@/app/lib/markets/category"

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

export function TabsBar({ currentTab, onTabChange, search, onSearchChange }: TabsBarProps) {
  const { t } = useTranslation()

  return (
    <div className="z-30 py-7 md:py-7">
      <MarketFilterBar
        chips={CATEGORY_TABS}
        tab={currentTab}
        onTabChange={(id) => onTabChange(id as BorrowTabId)}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={t("Search markets")}
      />
    </div>
  )
}

"use client"

import { BORROW_DEXES, type BorrowDexId } from "@/app/lib/borrow-sim"

export const POOL_TAB_IDS = ["all-markets", "btc", "eth", "forex", "governance", "smart-pools"] as const

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
  selectedDexes: Set<BorrowDexId>
  onDexChange: (dex: BorrowDexId | null) => void
}

const TAB_ORDER: Array<{ id: BorrowTabId; label: string }> = [
  { id: "all-markets", label: "All Markets" },
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
  { id: "forex", label: "Forex" },
  { id: "governance", label: "Governance" },
  { id: "smart-pools", label: "Smart Pools" },
]

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 text-muted-foreground/70 dark:text-white/40">
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3 text-muted-foreground/70 dark:text-white/60">
      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TabsBar({
  currentTab,
  onTabChange,
  search,
  onSearchChange,
  selectedDexes,
  onDexChange,
}: TabsBarProps) {
  const selectedDex = Array.from(selectedDexes)[0] ?? ""

  return (
    <div className="z-30">
      <div className="flex items-center gap-2 py-2.5">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-white px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-white/7 dark:bg-[#111111] dark:text-white/96 dark:focus-within:border-white/18 md:flex-none md:w-[280px]">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter assets"
            className="w-full bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none md:text-[15px] md:font-normal"
          />
        </label>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <div className="relative">
            <select
              aria-label="Filter market"
              value={currentTab}
              onChange={(event) => onTabChange(event.target.value as BorrowTabId)}
              className="h-9 appearance-none rounded-full border border-border bg-white px-2.5 pr-7 text-[13px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/88 dark:hover:bg-[#2b2b2b] md:h-10 md:px-5 md:pr-11 md:text-[14px]"
            >
              {TAB_ORDER.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60 md:right-3">
              <ChevronDownIcon />
            </span>
          </div>

          <div className="relative">
            <select
              aria-label="Filter DEX"
              value={selectedDex}
              onChange={(event) => onDexChange(event.target.value ? (event.target.value as BorrowDexId) : null)}
              className="h-9 appearance-none rounded-full border border-border bg-white px-2.5 pr-7 text-[13px] font-medium tracking-[-0.03em] text-foreground shadow-elev-1 outline-none transition-colors hover:bg-surface-1 dark:border-white/6 dark:bg-[#242424] dark:text-white/88 dark:hover:bg-[#2b2b2b] md:h-10 md:px-5 md:pr-11 md:text-[14px]"
            >
              <option value="">All DEX</option>
              {BORROW_DEXES.map((dex) => (
                <option key={dex.id} value={dex.id}>
                  {dex.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 dark:text-white/60 md:right-3">
              <ChevronDownIcon />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

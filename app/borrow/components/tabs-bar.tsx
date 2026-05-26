"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BORROW_DEXES, type BorrowDexId } from "@/app/lib/borrow-sim"
import { cn } from "@/lib/utils"

export const POOL_TAB_IDS = ["all-markets", "btc", "eth", "forex", "governance", "smart-pools"] as const

export type PoolTabId = (typeof POOL_TAB_IDS)[number]

export type BorrowTabId = PoolTabId | "assets" | "positions"

export type SortOption = { key: string; label: string }

export function isPoolTab(tab: BorrowTabId): tab is PoolTabId {
  return POOL_TAB_IDS.includes(tab as PoolTabId)
}

export type TabsBarProps = {
  currentTab: BorrowTabId
  onTabChange: (tab: BorrowTabId) => void
  counts: Record<BorrowTabId, number>
  selectedDexes: Set<BorrowDexId>
  onToggleDex: (dex: BorrowDexId) => void
  sortKey: string
  sortOptions: SortOption[]
  sortDirection: "asc" | "desc"
  onSortKeyChange: (key: string) => void
  onSortDirectionChange: (direction: "asc" | "desc") => void
}

const TAB_ORDER: Array<{ id: BorrowTabId; label: string }> = [
  { id: "all-markets", label: "All Markets" },
  { id: "btc", label: "BTC" },
  { id: "eth", label: "ETH" },
  { id: "forex", label: "Forex" },
  { id: "governance", label: "Governance" },
  { id: "smart-pools", label: "Smart Pools" },
  { id: "assets", label: "Assets" },
  { id: "positions", label: "Positions" },
]

export function TabsBar({
  currentTab,
  onTabChange,
  counts,
  selectedDexes,
  onToggleDex,
  sortKey,
  sortOptions,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
}: TabsBarProps) {
  const activeSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? sortOptions[0]?.label ?? ""

  return (
    <div className="sticky top-16 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:top-[68px]">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 py-1.5">
        <nav className="no-scrollbar flex items-center gap-2 overflow-x-auto" aria-label="Borrow sections">
          {TAB_ORDER.map((tab) => {
            const isActive = tab.id === currentTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[14px] font-normal transition-colors",
                  isActive
                    ? "border-border bg-surface-2 text-foreground dark:bg-surface-2 dark:text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-inset hover:text-foreground dark:bg-surface-1 dark:hover:bg-surface-hover",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "tabular-nums text-[14px] font-normal",
                    isActive ? "text-foreground/70" : "text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {counts[tab.id]}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {isPoolTab(currentTab) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full border px-3 text-[14px] font-normal transition-colors",
                    selectedDexes.size === 0 || selectedDexes.size === BORROW_DEXES.length
                      ? "border-border bg-surface-raised text-foreground hover:bg-surface-inset dark:bg-surface-2 dark:hover:bg-surface-hover"
                      : "border-transparent bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary-hover",
                  )}
                >
                  DEX
                  <ChevronDown className="size-3 opacity-60" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by DEX</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BORROW_DEXES.map((dex) => (
                  <DropdownMenuCheckboxItem
                    key={dex.id}
                    checked={selectedDexes.has(dex.id)}
                    onCheckedChange={() => onToggleDex(dex.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <span className={cn("mr-2 size-1.5 rounded-full", dex.dotClass)} aria-hidden />
                    {dex.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {sortOptions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-border bg-surface-raised px-3 text-[14px] font-normal text-foreground transition-colors hover:bg-surface-inset dark:bg-surface-2 dark:hover:bg-surface-hover"
                >
                  {activeSortLabel}
                  <ChevronDown className="size-3 opacity-60" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortKey} onValueChange={onSortKeyChange}>
                  {sortOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.key} value={option.key}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  Order
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortDirection}
                  onValueChange={(value) => onSortDirectionChange(value as "asc" | "desc")}
                >
                  <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  )
}

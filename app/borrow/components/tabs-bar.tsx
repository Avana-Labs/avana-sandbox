"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Search, X } from "lucide-react"
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
import { PillTabButton } from "@/components/ui/pill-tab-button"
import { cn } from "@/lib/utils"

export type BorrowTabId = "pools" | "assets" | "positions"

export type SortOption = { key: string; label: string }

export type TabsBarProps = {
  currentTab: BorrowTabId
  onTabChange: (tab: BorrowTabId) => void
  counts: Record<BorrowTabId, number>
  filterText: string
  onFilterChange: (value: string) => void
  selectedDexes: Set<BorrowDexId>
  onToggleDex: (dex: BorrowDexId) => void
  sortKey: string
  sortOptions: SortOption[]
  sortDirection: "asc" | "desc"
  onSortKeyChange: (key: string) => void
  onSortDirectionChange: (direction: "asc" | "desc") => void
}

const TAB_ORDER: Array<{ id: BorrowTabId; label: string }> = [
  { id: "pools", label: "Collaterals" },
  { id: "assets", label: "Assets" },
  { id: "positions", label: "Positions" },
]

export function TabsBar({
  currentTab,
  onTabChange,
  counts,
  filterText,
  onFilterChange,
  selectedDexes,
  onToggleDex,
  sortKey,
  sortOptions,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
}: TabsBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    onFilterChange("")
    setSearchOpen(false)
  }, [currentTab, onFilterChange])

  const activeSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? sortOptions[0]?.label ?? ""

  return (
    <div className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 py-1.5">
        <nav className="no-scrollbar flex items-center gap-0 overflow-x-auto" aria-label="Borrow sections">
          {TAB_ORDER.map((tab) => {
            const isActive = tab.id === currentTab
            return (
              <PillTabButton
                key={tab.id}
                type="button"
                active={isActive}
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
                <span className="ml-1 tabular-nums text-[10px] font-medium text-muted-foreground" aria-hidden>
                  {counts[tab.id]}
                </span>
              </PillTabButton>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {searchOpen ? (
            <div className="flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-inset px-2">
              <Search className="size-3 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={filterText}
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder={currentTab === "assets" ? "Filter tokens" : currentTab === "pools" ? "Filter pools" : "Filter"}
                className="h-5 w-36 border-none bg-transparent text-[12px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  onFilterChange("")
                  setSearchOpen(false)
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex size-7 items-center justify-center rounded-xs border border-border bg-surface-raised text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
              aria-label="Open search"
            >
              <Search className="size-3" aria-hidden />
            </button>
          )}

          {currentTab === "pools" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-xs border px-2 text-[12px] font-medium transition-colors",
                    selectedDexes.size === 0 || selectedDexes.size === BORROW_DEXES.length
                      ? "border-border bg-surface-raised text-foreground hover:bg-surface-inset"
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
                  className="inline-flex h-7 items-center gap-1 rounded-xs border border-border bg-surface-raised px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-inset"
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

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
import { cn } from "@/lib/utils"

export type BorrowTabId = "pools" | "supplies" | "assets" | "debts"

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
  { id: "pools", label: "Pools to Supply" },
  { id: "supplies", label: "My Supplies" },
  { id: "assets", label: "Assets to Borrow" },
  { id: "debts", label: "My Borrows" },
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
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-card/95 px-4 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 py-2">
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Borrow sections">
          {TAB_ORDER.map((tab) => {
            const isActive = tab.id === currentTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-[15px] transition-colors",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground font-medium hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
                <span className={cn("ml-1.5 text-sm font-normal", isActive ? "text-muted-foreground" : "text-muted-foreground")}>
                  {counts[tab.id]}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {searchOpen ? (
            <div className="flex h-8 items-center gap-1.5 rounded-full bg-muted px-3">
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={filterText}
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder={currentTab === "assets" ? "Filter tokens" : currentTab === "pools" ? "Filter pools" : "Filter"}
                className="h-5 w-36 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  onFilterChange("")
                  setSearchOpen(false)
                }}
                className="text-muted-foreground hover:text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted"
              aria-label="Open search"
            >
              <Search className="size-3.5" aria-hidden />
            </button>
          )}

          {currentTab === "pools" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                    selectedDexes.size === 0 || selectedDexes.size === BORROW_DEXES.length
                      ? "bg-muted text-foreground hover:bg-muted"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  DEX
                  <ChevronDown className="size-3.5 opacity-60" aria-hidden />
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {activeSortLabel}
                  <ChevronDown className="size-3.5 opacity-60" aria-hidden />
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
                <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
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

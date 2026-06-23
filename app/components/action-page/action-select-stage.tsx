"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { ActionTokenIcon, ActionTokenPairIcon } from "@/app/components/action-page/action-token-icon"

export type ActionSelectItem = {
  id: string
  name: string
  symbol: string
  sublabel?: string
  trailingLabel: string
  trailingSublabel?: string
  pairSymbols?: [string, string]
}

export function ActionSelectStage({
  items,
  onSelect,
  sectionLabel = "Available assets",
  searchPlaceholder = "Find an asset",
  emptyTitle = "No assets found",
  emptyDescription = "Try adjusting your search",
}: {
  items: ActionSelectItem[]
  onSelect: (id: string) => void
  sectionLabel?: string
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        item.symbol.toLowerCase().includes(needle) ||
        item.sublabel?.toLowerCase().includes(needle),
    )
  }, [items, query])

  return (
    <div data-testid="action-select-stage">
      <label className="block">
        <span className="sr-only">{searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-11 w-full rounded-radius-sm border border-border bg-surface-inset px-4 text-[14px] outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{sectionLabel}</div>

      <div className="mt-2 divide-y divide-border rounded-radius-md border-0 bg-card">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-[14px] font-medium">{emptyTitle}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">{emptyDescription}</div>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors",
                "hover:bg-table-header/70 dark:hover:bg-table-header/90",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.pairSymbols ? (
                  <ActionTokenPairIcon collateralSymbol={item.pairSymbols[0]} borrowSymbol={item.pairSymbols[1]} size="md" />
                ) : (
                  <ActionTokenIcon symbol={item.symbol} />
                )}
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium">{item.name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">{item.sublabel ?? item.symbol}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] font-medium text-foreground">{item.trailingLabel}</div>
                {item.trailingSublabel ? (
                  <div className="mt-0.5 text-[12px] text-muted-foreground">{item.trailingSublabel}</div>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

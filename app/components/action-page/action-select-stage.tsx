"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"

export type ActionSelectItem = {
  id: string
  name: string
  symbol: string
  trailingLabel: string
  icon?: React.ReactNode
}

export function ActionSelectStage({
  title,
  subtitle,
  items,
  onSelect,
  emptyTitle = "No assets found",
  emptyDescription = "Try adjusting your search",
}: {
  title: string
  subtitle: string
  items: ActionSelectItem[]
  onSelect: (id: string) => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) => item.name.toLowerCase().includes(needle) || item.symbol.toLowerCase().includes(needle))
  }, [items, query])

  return (
    <div data-testid="action-select-stage">
      <div className="pb-4">
        <h2 className="text-[clamp(2rem,6vw,2.75rem)] font-medium tracking-[-0.04em]">{title}</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
      </div>

      <label className="block">
        <span className="sr-only">Find an asset</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find an asset"
          className="h-12 w-full rounded-[16px] border border-border bg-surface-raised px-4 text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="mt-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Available assets</div>

      <div className="mt-3 divide-y divide-border rounded-[20px] border border-border bg-surface-raised">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="text-[15px] font-medium">{emptyTitle}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">{emptyDescription}</div>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn("flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40")}
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.icon}
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium">{item.name}</div>
                  <div className="truncate text-[13px] text-muted-foreground">{item.symbol}</div>
                </div>
              </div>
              <div className="shrink-0 text-[13px] text-muted-foreground">{item.trailingLabel}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

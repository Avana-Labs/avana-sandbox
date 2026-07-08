"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  const { t } = useTranslation()
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
      <label className="relative block">
        <span className="sr-only">{t(searchPlaceholder)}</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(searchPlaceholder)}
          className="h-11 w-full rounded-full border border-[#e6e6e6] bg-[#fafafa] pl-11 pr-4 text-[14px] font-normal tracking-[-0.01em] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/20 dark:border-border/60 dark:bg-surface-2 dark:focus:border-brand/30"
        />
      </label>

      <div className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t(sectionLabel)}</div>

      <div className="mt-2 divide-y divide-border/80 overflow-hidden rounded-radius-md border border-border/80 bg-card">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-[14px] font-medium">{t(emptyTitle)}</div>
            <div className="mt-1 text-[13px] text-muted-foreground">{t(emptyDescription)}</div>
          </div>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors",
                "hover:bg-surface-hover",
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
                  <div className="truncate text-[13px] text-muted-foreground">{item.sublabel ?? item.symbol}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[14px] font-medium text-foreground">{item.trailingLabel}</div>
                {item.trailingSublabel ? (
                  <div className="mt-0.5 text-[13px] text-muted-foreground">{item.trailingSublabel}</div>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

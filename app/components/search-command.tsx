"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowUpRight, BadgeDollarSign, Layers3, Search, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { triggerPageLoading } from "@/app/lib/page-loading"
import { borrowAssetDetailPath } from "@/app/lib/borrow-routes"
import type { BorrowAssetVisual } from "@/app/lib/borrow-sim"
import { TOKEN_ICON_TABLE_PX } from "@/app/lib/token-icon-sizes"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { rankResults } from "@/app/lib/search-ranking"

type SearchTab = "all" | "pools" | "borrow" | "lend"

type SearchResult = {
  id: string
  tab: Exclude<SearchTab, "all">
  title: string
  subtitle: string
  eyebrow: string
  metric: string
  href: string
  keywords: string
  visual: BorrowAssetVisual | [BorrowAssetVisual, BorrowAssetVisual]
}

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "pools", label: "Collateral pools" },
  { id: "borrow", label: "Borrow" },
  { id: "lend", label: "Lend" },
]

const formatCompactUsd = (value: number) => {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "USD",
  }).format(value)
}

async function getSearchResults(): Promise<SearchResult[]> {
  const [{ BORROWABLE_ASSETS, BORROW_POOL_CATALOG }, { MARKETS, TOKENS }] = await Promise.all([
    import("@/app/lib/borrow-sim"),
    import("@/app/lend/components/data"),
  ])
  const lendSymbols: ReadonlySet<string> = new Set([
    ...TOKENS.map((token) => token.symbol),
    ...MARKETS.map((market) => market.symbol),
  ])
  const poolResults = BORROW_POOL_CATALOG.slice(0, 18).map((pool) => ({
    id: `pool-${pool.id}`,
    tab: "pools" as const,
    title: pool.name,
    subtitle: `${pool.venue} / ${pool.feeTier} / ${formatCompactUsd(pool.availableUsd)} available`,
    eyebrow: "Collateral pool",
    metric: `${pool.ltv}% LTV`,
    href: `/borrow/markets/${pool.id}`,
    keywords: `${pool.name} ${pool.venue} ${pool.spoke} collateral lp pool liquidity ${pool.borrowableTokens
      .map((token) => token.symbol)
      .join(" ")}`,
    visual: pool.visuals,
  }))

  const borrowResults = BORROWABLE_ASSETS.map((asset) => ({
    id: `borrow-${asset.id}`,
    tab: "borrow" as const,
    title: asset.name,
    subtitle: `${asset.symbol} / ${asset.subtitle} / ${formatCompactUsd(asset.availableUsd)} available`,
    eyebrow: "Borrow asset",
    metric: `${asset.borrowApr.toFixed(1)}% APR`,
    href: borrowAssetDetailPath(asset.id),
    keywords: `${asset.id} ${asset.symbol} ${asset.name} borrow debt credit asset`,
    visual: asset.visual,
  }))

  const lendResults = BORROWABLE_ASSETS.filter((asset) => lendSymbols.has(asset.symbol))
    .slice(0, 12)
    .map((asset) => ({
      id: `lend-${asset.id}`,
      tab: "lend" as const,
      title: asset.name,
      subtitle: `${asset.symbol} lending market / ${asset.utilization}% utilization`,
      eyebrow: "Lend asset",
      metric: `${Math.max(asset.borrowApr - 0.8, 0.1).toFixed(1)}% APY`,
      href: borrowAssetDetailPath(asset.id),
      keywords: `${asset.id} ${asset.symbol} ${asset.name} lend deposit supply yield apy`,
      visual: asset.visual,
    }))

  return [...poolResults, ...borrowResults, ...lendResults]
}

function TokenAvatar({ visual }: { visual: BorrowAssetVisual }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-medium",
        visual.bgClass,
        visual.textClass,
      )}
    >
      {visual.iconUrl ? (
        <Image src={visual.iconUrl} alt="" width={TOKEN_ICON_TABLE_PX} height={TOKEN_ICON_TABLE_PX} className="size-full rounded-full object-cover" />
      ) : (
        visual.shortLabel
      )}
    </span>
  )
}

function PoolAvatar({ visuals }: { visuals: [BorrowAssetVisual, BorrowAssetVisual] }) {
  return (
    <span className="relative flex h-10 w-[3.25rem] shrink-0 items-center">
      <span
        className={cn(
          "absolute left-0 flex size-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-background",
          visuals[0].bgClass,
          visuals[0].textClass,
        )}
      >
        {visuals[0].iconUrl ? (
          <Image src={visuals[0].iconUrl} alt="" width={TOKEN_ICON_TABLE_PX} height={TOKEN_ICON_TABLE_PX} className="size-full rounded-full object-cover" />
        ) : (
          <span className="text-[10px] font-medium">{visuals[0].shortLabel}</span>
        )}
      </span>
      <span
        className={cn(
          "absolute left-5 flex size-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-background",
          visuals[1].bgClass,
          visuals[1].textClass,
        )}
      >
        {visuals[1].iconUrl ? (
          <Image src={visuals[1].iconUrl} alt="" width={TOKEN_ICON_TABLE_PX} height={TOKEN_ICON_TABLE_PX} className="size-full rounded-full object-cover" />
        ) : (
          <span className="text-[10px] font-medium">{visuals[1].shortLabel}</span>
        )}
      </span>
    </span>
  )
}

function ResultIcon({ result }: { result: SearchResult }) {
  if (Array.isArray(result.visual)) {
    return <PoolAvatar visuals={result.visual} />
  }

  return <TokenAvatar visual={result.visual} />
}

function SectionIcon({ tab }: { tab: SearchResult["tab"] }) {
  if (tab === "pools") return <Layers3 className="h-3.5 w-3.5" />
  if (tab === "borrow") return <BadgeDollarSign className="h-3.5 w-3.5" />
  return <Sparkles className="h-3.5 w-3.5" />
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT"
}

export function SearchCommand({ iconOnly = false }: { iconOnly?: boolean } = {}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SearchTab>("all")
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeItemRef = useRef<HTMLButtonElement | null>(null)

  const loadResults = useCallback(async () => {
    if (results || loadingResults) {
      return
    }

    setLoadingResults(true)

    try {
      setResults(await getSearchResults())
    } finally {
      setLoadingResults(false)
    }
  }, [loadingResults, results])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return
      }

      event.preventDefault()
      void loadResults()
      setOpen(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [loadResults])

  useEffect(() => {
    if (!open) {
      return
    }

    void loadResults()
  }, [loadResults, open])

  const normalizedQuery = query.trim().toLowerCase()
  const resolvedResults = results ?? []

  const groupedResults = useMemo<Array<[SearchResult["tab"], SearchResult[]]>>(() => {
    const tabScoped = resolvedResults.filter((result) => activeTab === "all" || result.tab === activeTab)
    const ranked = rankResults(tabScoped, normalizedQuery)
    const groupLimit = activeTab === "all" && !normalizedQuery ? 4 : 12
    return (["pools", "borrow", "lend"] as const)
      .map(
        (tab) =>
          [tab, ranked.filter((result) => result.tab === tab).slice(0, groupLimit)] as [
            SearchResult["tab"],
            SearchResult[],
          ],
      )
      .filter(([, group]) => group.length > 0)
  }, [resolvedResults, activeTab, normalizedQuery])

  // Flat list in rendered order, used for keyboard navigation.
  const flatResults = useMemo(() => groupedResults.flatMap(([, group]) => group), [groupedResults])

  // Reset/clamp the active item whenever the visible list changes.
  useEffect(() => {
    setActiveIndex((current) => (flatResults.length === 0 ? 0 : Math.min(current, flatResults.length - 1)))
  }, [flatResults])

  useEffect(() => {
    setActiveIndex(0)
  }, [normalizedQuery, activeTab])

  useEffect(() => {
    activeItemRef.current?.scrollIntoView?.({ block: "nearest" })
  }, [activeIndex])

  const goToResult = (href: string) => {
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
    triggerPageLoading()
    router.push(href)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatResults.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % flatResults.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + flatResults.length) % flatResults.length)
    } else if (event.key === "Enter") {
      const active = flatResults[activeIndex]
      if (active) {
        event.preventDefault()
        goToResult(active.href)
      }
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("Search Avana")}
        onClick={() => {
          void loadResults()
          setOpen(true)
        }}
        className={
          iconOnly
            ? "inline-flex h-10 w-10 items-center justify-center text-brand-readable transition hover:text-foreground focus-visible:outline-none focus-visible:ring-0 active:scale-95 [-webkit-tap-highlight-color:transparent]"
            : "flex h-9 w-full items-center gap-2.5 rounded-full border border-border bg-surface-inset px-3.5 text-left text-[14px] font-normal tracking-[-0.01em] text-muted-foreground shadow-none transition-colors hover:bg-muted lg:h-10 lg:gap-3 lg:px-4 lg:text-[15px]"
        }
        >
        {iconOnly ? (
          <Search className="h-5 w-5" />
        ) : (
          <>
            <Search className="h-4 w-4 shrink-0 text-brand-readable lg:h-[17px] lg:w-[17px]" />
            <span className="min-w-0 flex-1 truncate">{t("Search pools, borrow, lend, and more")}</span>
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[7px] border border-border bg-muted px-1 text-[10px] font-normal text-brand-readable lg:h-[22px] lg:min-w-[22px] lg:text-[11px]">
              /
            </span>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(620px,calc(100dvh-96px))] w-full max-w-[500px] gap-0 overflow-hidden rounded-[20px] border-border bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:w-[calc(100vw-24px)] sm:rounded-[20px] [&>button]:right-3.5 [&>button]:top-3.5 [&>button]:rounded-full">
          <DialogTitle className="sr-only">{t("Search Avana")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("Search collateral pools, assets to borrow, and assets to lend.")}
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              role="combobox"
              aria-expanded={flatResults.length > 0}
              aria-controls="search-command-results"
              aria-activedescendant={flatResults[activeIndex] ? `search-result-${flatResults[activeIndex].id}` : undefined}
              placeholder={t("Search pools, borrow assets, lend assets")}
              className="h-8 min-w-0 flex-1 bg-transparent text-[16px] font-normal text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-1 border-b border-border px-3 py-2">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    isActive ? "bg-surface-inset text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(tab.label)}
                </button>
              )
            })}
          </div>

          <div id="search-command-results" role="listbox" className="max-h-[430px] overflow-y-auto px-2 py-2.5">
            {loadingResults && results == null ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[15px] font-medium text-foreground">{t("Loading results")}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{t("Preparing pools, borrow assets, and lend assets.")}</p>
              </div>
            ) : groupedResults.length > 0 ? (
              groupedResults.map(([tab, group]) => (
                <section key={tab} className="pb-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
                    <SectionIcon tab={tab} />
                    <span>{t(tab === "pools" ? "Pools to use as collateral" : tab === "borrow" ? "Assets to borrow" : "Assets to lend")}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.map((result) => {
                      const flatIndex = flatResults.indexOf(result)
                      const isActive = flatIndex === activeIndex
                      return (
                      <button
                        key={result.id}
                        id={`search-result-${result.id}`}
                        ref={isActive ? activeItemRef : undefined}
                        role="option"
                        aria-selected={isActive}
                        type="button"
                        onClick={() => goToResult(result.href)}
                        onMouseMove={() => setActiveIndex(flatIndex)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-[13px] px-3 py-2 text-left transition-colors hover:bg-surface-inset",
                          isActive && "bg-surface-inset",
                        )}
                      >
                        <ResultIcon result={result} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-medium leading-5 text-foreground">
                              {result.title}
                            </span>
                            <span className="hidden shrink-0 rounded-full bg-surface-inset px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                              {result.eyebrow}
                            </span>
                          </span>
                          <span className="block truncate text-[12px] leading-5 text-muted-foreground">
                            {result.subtitle}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground group-hover:text-foreground">
                          {result.metric}
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </span>
                      </button>
                      )
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-[15px] font-medium text-foreground">{t("No results found")}</p>
                <p className="mt-1 text-[13px] text-muted-foreground">{t("Try a token symbol, pool pair, or action like borrow.")}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

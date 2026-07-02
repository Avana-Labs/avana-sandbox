"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { hasImageSrc, resolveImageSrc } from "@/lib/image-src"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { CategoryChips } from "@/app/lib/ui/category-chips"
import { CATEGORY_CHIPS, type CategoryChip } from "@/app/lib/markets/category"

const BTC_SYMBOLS = new Set(["WBTC", "CBBTC", "BTC"])
const ETH_SYMBOLS = new Set(["ETH", "WETH", "STETH", "WSTETH", "RETH", "CBETH", "WEETH"])
const FOREX_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "CRVUSD",
  "GHO",
  "EURC",
  "USD+",
  "SDAI",
  "FRAX",
  "USDE",
  "USDS",
  "USDP",
  "LUSD",
  "TUSD",
  "MIM",
  "PYUSD",
  "EURS",
])
const UTILITY_SYMBOLS = new Set(["AAVE", "UNI", "CRV", "LDO", "BAL", "AURA", "GNO", "ARB", "OP", "LINK", "MKR"])

const CATEGORY_TABS = CATEGORY_CHIPS.multiply

const SORT_PRESETS = [
  { label: "Highest Leverage", value: "rewards:desc" },
  { label: "Highest APY", value: "apy:desc" },
  { label: "Most Available", value: "points:desc" },
  { label: "Collateral A-Z", value: "protocol:asc" },
] as const

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

type MultiplyCategoryTabId = CategoryChip["id"]

function parseCompactUsdLabel(value?: string) {
  if (!value) return null
  const match = value.trim().match(/^\$?([\d,.]+)([KMB])?$/i)
  if (!match) return null
  const amount = Number.parseFloat(match[1].replace(/,/g, ""))
  if (!Number.isFinite(amount)) return null
  const suffix = match[2]?.toUpperCase()
  return amount * (suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1)
}

function SearchIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-6 text-brand", className)}>
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ExpandableDesktopSearch({ value, onChange }: { value: string; onChange: (nextValue: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const isExpanded = open || value.length > 0

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <div
        className={cn(
          "flex h-10 items-center overflow-hidden border shadow-elev-1 transition-[width,border-radius,background-color,border-color] duration-200",
          isExpanded ? "w-[240px] rounded-radius-md px-3" : "w-10 cursor-pointer justify-center rounded-radius-md",
          "border-border bg-card text-foreground dark:border-border/60 dark:text-[#e6f8fb]",
        )}
        onClick={() => {
          if (!isExpanded) setOpen(true)
        }}
      >
        <button
          type="button"
          aria-label="Search loops"
          className={cn(
            "flex shrink-0 items-center justify-center",
            isExpanded ? "pointer-events-none mr-2 size-5" : "size-10",
          )}
          onClick={() => setOpen(true)}
        >
          <SearchIcon className={cn(isExpanded ? "size-5" : "size-6", "dark:text-brand")} />
        </button>

        {isExpanded ? (
          <input
            ref={inputRef}
            aria-label="Search loops"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search loops"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/65 dark:text-[#e6f8fb] dark:placeholder:text-muted-foreground/45"
          />
        ) : null}
      </div>
    </div>
  )
}

function FilterCheckIcon({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-brand bg-brand text-white"
          : "border-black/35 bg-transparent text-transparent dark:border-white/55",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3">
        <path
          d="M2.5 6.2 4.8 8.5 9.5 3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function SingleSelectDropdown({
  allLabel,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  allLabel: string
  value: string | null
  options: Array<{ label: string; value: string }>
  onChange: (nextValue: string | null) => void
  ariaLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const [openUpward, setOpenUpward] = React.useState(false)
  const [panelStyle, setPanelStyle] = React.useState<{
    left: number
    top: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  const triggerLabel = options.find((option) => option.value === value)?.label ?? allLabel

  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return

    const updatePanelPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      const nextOpenUpward = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const maxHeight = Math.max(140, Math.min(220, (nextOpenUpward ? spaceAbove : spaceBelow) - 12))
      const top = nextOpenUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setOpenUpward(nextOpenUpward)
      setPanelStyle({ left, top, width, maxHeight })
    }

    updatePanelPosition()

    const updateAnchoredPosition = () => {
      if (!rootRef.current || !panelRef.current) return

      const triggerRect = rootRef.current.getBoundingClientRect()
      const panelHeight = panelRef.current.offsetHeight
      const width = Math.min(216, window.innerWidth - 16)
      const left = Math.max(8, triggerRect.right - width)
      const availableSpace = openUpward ? triggerRect.top : window.innerHeight - triggerRect.bottom
      const maxHeight = Math.max(140, Math.min(220, availableSpace - 12))
      const top = openUpward
        ? Math.max(8, triggerRect.top - Math.min(panelHeight, maxHeight) - 8)
        : Math.min(window.innerHeight - Math.min(panelHeight, maxHeight) - 8, triggerRect.bottom + 8)

      setPanelStyle({ left, top, width, maxHeight })
    }

    window.addEventListener("resize", updateAnchoredPosition)
    window.addEventListener("scroll", updateAnchoredPosition, true)

    return () => {
      window.removeEventListener("resize", updateAnchoredPosition)
      window.removeEventListener("scroll", updateAnchoredPosition, true)
    }
  }, [open, openUpward, options.length])

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-radius-md px-3.5 text-[13px] font-medium tracking-[-0.03em] shadow-elev-1 outline-none transition-colors focus-visible:ring-2 md:h-10 md:px-4 md:text-[14px]",
          "border border-border bg-card text-foreground hover:bg-neutral-50 focus-visible:ring-black/10 dark:border-white/8 dark:text-white dark:hover:bg-[#262626] dark:focus-visible:ring-white/10",
        )}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <span className="text-foreground/70 dark:text-white/80">
          <ChevronDown className="size-3.5" />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={`Close ${ariaLabel}`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default bg-transparent"
          />

          <div
            ref={panelRef}
            className={cn(
              "fixed z-30 overflow-hidden rounded-radius-md border shadow-[0_22px_44px_rgba(0,0,0,0.24)]",
              "border-border bg-popover text-foreground dark:border-white/8 dark:bg-surface-inset dark:text-white",
            )}
            style={
              panelStyle
                ? {
                    left: panelStyle.left,
                    top: panelStyle.top,
                    width: panelStyle.width,
                    maxHeight: panelStyle.maxHeight,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium tracking-[-0.03em] transition-colors md:h-11 md:px-4 md:text-[14px]",
                "text-foreground hover:bg-black/[0.04] dark:text-white/82 dark:hover:bg-card/5",
              )}
            >
              <FilterCheckIcon checked={value === null} />
              <span>{allLabel}</span>
            </button>

            <div className="w-full border-t border-black/12 dark:border-white/20" />

            <div
              className="overflow-y-auto py-1 pb-3"
              style={panelStyle ? { maxHeight: panelStyle.maxHeight - 41 } : undefined}
            >
              {options.map((option) => {
                const checked = value === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 px-3.5 text-left text-[13px] tracking-[-0.03em] transition-colors md:h-10 md:px-4 md:text-[14px]",
                      checked
                        ? "bg-black/[0.05] font-medium text-foreground dark:bg-card/6 dark:text-white"
                        : "text-foreground/82 hover:bg-black/[0.04] dark:text-white/82 dark:hover:bg-card/5",
                    )}
                  >
                    <FilterCheckIcon checked={checked} />
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

type ExploreLoopsMarketsTableProps = {
  rows: MultiplyPageData["lendRows"]
  trendingSnapshots: MultiplyPageData["trendingSnapshots"]
  pageSize: MultiplyPageData["pageSize"]
  tokenBorrowApys: MultiplyPageData["tokenBorrowApys"]
  tokenLogos: MultiplyPageData["tokenLogos"]
  tokenSupplyApys: MultiplyPageData["tokenSupplyApys"]
  onOpenMultiply?: (href: string) => void
}

export function ExploreLoopsMarketsTable({
  rows,
  trendingSnapshots,
  pageSize,
  tokenBorrowApys,
  tokenLogos,
  tokenSupplyApys,
  onOpenMultiply,
}: ExploreLoopsMarketsTableProps) {
  const { compact } = useCurrency()
  const [currentTab, setCurrentTab] = React.useState<MultiplyCategoryTabId>("all")
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [sortKey, setSortKey] = React.useState<"protocol" | "asset" | "apy" | "rewards" | "points">("protocol")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const searchQuery = search.trim().toLowerCase()
  const buildSearchText = (row: (typeof rows)[number]) =>
    [
      row.protocol,
      row.asset,
      row.kind,
      row.apy,
      row.apyLabel,
      row.partnerRewards ?? "",
      row.points ?? "",
      ...(row.rewardRows?.flatMap((reward) => [reward.label, reward.value]) ?? []),
    ]
      .join(" ")
      .toLowerCase()

  const filteredRows = React.useMemo(() => {
    const hasAnySymbol = (symbols: Set<string>, ...values: string[]) =>
      values.some((value) => symbols.has(value.toUpperCase()))

    return rows
      .filter((row) => {
        const protocol = row.protocol.toUpperCase()
        const asset = row.asset.toUpperCase()
        const matchesBtc = hasAnySymbol(BTC_SYMBOLS, protocol, asset)
        const matchesEth = hasAnySymbol(ETH_SYMBOLS, protocol, asset)
        const matchesForex = hasAnySymbol(FOREX_SYMBOLS, protocol) && hasAnySymbol(FOREX_SYMBOLS, asset)
        const matchesUtility = hasAnySymbol(UTILITY_SYMBOLS, protocol, asset)
        const matchesSmartLoop =
          (hasAnySymbol(ETH_SYMBOLS, protocol) && hasAnySymbol(ETH_SYMBOLS, asset)) ||
          (hasAnySymbol(FOREX_SYMBOLS, protocol) && hasAnySymbol(FOREX_SYMBOLS, asset)) ||
          (hasAnySymbol(BTC_SYMBOLS, protocol) && hasAnySymbol(BTC_SYMBOLS, asset))

        if (currentTab === "all") return true
        if (currentTab === "btc") return matchesBtc
        if (currentTab === "eth") return matchesEth
        if (currentTab === "forex") return matchesForex
        if (currentTab === "utility") return matchesUtility
        if (currentTab === "smart") return matchesSmartLoop
        return true
      })
      .filter((row) => searchQuery.length === 0 || buildSearchText(row).includes(searchQuery))
  }, [currentTab, searchQuery])

  const sortedRows = React.useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1
    const parseValue = (value?: string) => {
      if (!value) return Number.NEGATIVE_INFINITY
      const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
      return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY
    }

    return [...filteredRows].sort((a, b) => {
      switch (sortKey) {
        case "asset":
          return a.asset.localeCompare(b.asset) * direction
        case "apy":
          return (parseValue(a.apy) - parseValue(b.apy)) * direction
        case "rewards":
          return (
            (parseValue(a.rewardRows?.[1]?.value ?? a.rewardRows?.[0]?.value ?? a.partnerRewards) -
              parseValue(b.rewardRows?.[1]?.value ?? b.rewardRows?.[0]?.value ?? b.partnerRewards)) *
            direction
          )
        case "points":
          return (parseValue(a.points) - parseValue(b.points)) * direction
        case "protocol":
        default:
          return a.protocol.localeCompare(b.protocol) * direction
      }
    })
  }, [filteredRows, sortDirection, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const visibleRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize)

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "protocol" || nextKey === "asset" ? "asc" : "desc")
  }

  const getAssetLogo = (asset: string) => tokenLogos[asset as keyof typeof tokenLogos]
  const getSupplyApy = (asset: string) => tokenSupplyApys[asset as keyof typeof tokenSupplyApys]
  const getBorrowApy = (asset: string) => tokenBorrowApys[asset as keyof typeof tokenBorrowApys]

  return (
    <section className="mt-1 space-y-4">
      <div>
        <div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Trending</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Highest max-leverage APY markets in the sandbox catalog.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid min-w-max grid-flow-col gap-4 md:min-w-0 md:grid-flow-row md:grid-cols-2 xl:grid-cols-4">
          {trendingSnapshots.map((snapshot) => (
            <TrendingLoopCard key={snapshot.marketId} snapshot={snapshot} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <CategoryChips chips={CATEGORY_TABS} value={currentTab} onChange={setCurrentTab} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SingleSelectDropdown
            allLabel="Sort by"
            value={`${sortKey}:${sortDirection}`}
            options={SORT_PRESETS.map((preset) => ({
              label: preset.label,
              value: preset.value,
            }))}
            onChange={(nextValue) => {
              if (!nextValue) return
              const [nextSortKey, nextSortDirection] = nextValue.split(":") as [typeof sortKey, typeof sortDirection]
              setSortKey(nextSortKey)
              setSortDirection(nextSortDirection)
            }}
            ariaLabel="Sort loops"
          />
          <ExpandableDesktopSearch value={search} onChange={setSearch} />
        </div>
      </div>

      <div className="rounded-radius-md bg-transparent">
        <div className="space-y-3 md:hidden">
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <MobileLoopCard
                key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                row={row}
                protocolLogo={getResolvedLogo(row.protocolLogo)}
                assetLogo={getResolvedLogo(getAssetLogo(row.asset))}
                supplyApy={getSupplyApy(row.protocol)}
                borrowApy={getBorrowApy(row.asset)}
                availableLabel={
                  parseCompactUsdLabel(row.points) == null ? (row.points ?? "—") : compact(parseCompactUsdLabel(row.points) as number)
                }
                onOpenMultiply={onOpenMultiply}
              />
            ))
          ) : (
            <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground shadow-elev-1">
              No loops in this category yet.
            </div>
          )}
        </div>

        <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-radius-lg bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  #
                </th>
                <th className="bg-table-header px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("protocol")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "protocol"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>COLLATERAL</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "asset"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>BORROWABLE</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("apy")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "apy"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>MAX APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("rewards")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "rewards"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>MAX LEVERAGE</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("points")}
                    className={cn(
                      "flex items-center gap-2 whitespace-nowrap transition-colors",
                      sortKey === "points"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>AVAILABLE</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="rounded-r-radius-lg bg-table-header px-4 py-3.5 pr-4 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody
              key={`multiply-${sortKey}-${sortDirection}-${visibleRows.length}`}
              className="divide-y divide-border dark:divide-white/6"
            >
              {visibleRows.length ? (
                visibleRows.map((row, index) => (
                  <tr
                    key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                    className="group asset-swap transition-colors"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <td
                      className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
                    >
                      {page * pageSize + index + 1}
                    </td>
                    <td className={`py-3 pl-6 pr-4 ${TABLE_ROW_HOVER_BG}`}>
                      <CellLink href={row.href} className="flex items-center gap-2.5">
                        {hasImageSrc(row.protocolLogo) ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={row.protocolLogo}
                              alt=""
                              aria-hidden="true"
                              className="size-10 shrink-0 rounded-full bg-card object-cover"
                            />
                          </>
                        ) : null}
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                            {row.protocol}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                            <span className="text-muted-foreground dark:text-white/38">APY</span>
                            <span className="font-data tabular-nums text-success">
                              {getSupplyApy(row.protocol) ?? "—"}
                            </span>
                          </span>
                        </span>
                      </CellLink>
                    </td>
                    <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
                      <CellLink href={row.href} className="flex min-w-0 items-center gap-2.5">
                        {getAssetLogo(row.asset) ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getAssetLogo(row.asset)}
                              alt=""
                              aria-hidden="true"
                              className="size-10 shrink-0 rounded-full bg-card object-cover"
                            />
                          </>
                        ) : null}
                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
                            {row.asset}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                            <span className="text-muted-foreground dark:text-white/38">APY</span>
                            <span className="font-data tabular-nums text-rose-600 dark:text-rose-400">
                              {getBorrowApy(row.asset) ?? "—"}
                            </span>
                          </span>
                        </span>
                      </CellLink>
                    </td>
                    <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
                      <CellLink
                        href={row.href}
                        className={cn(
                          "font-data text-[14px] font-normal tracking-[-0.03em] tabular-nums",
                          row.apy
                            ? row.apy.startsWith("-")
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-success"
                            : "text-muted-foreground",
                        )}
                      >
                        {row.apy || "—"}
                      </CellLink>
                    </td>
                    <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
                      <CellLink href={row.href} className="text-foreground">
                        {row.rewardRows?.[1] ? (
                          <span className="block">
                            <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                              {row.rewardRows[1].value}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                              {row.rewardRows[1].label}
                            </span>
                          </span>
                        ) : row.rewardRows?.[0] ? (
                          <span className="block">
                            <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                              {row.rewardRows[0].value}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                              {row.rewardRows[0].label}
                            </span>
                          </span>
                        ) : row.partnerRewards ? (
                          <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                            {row.partnerRewards}
                          </span>
                        ) : (
                          <span className="block text-[14px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                            —
                          </span>
                        )}
                      </CellLink>
                    </td>
                    <td className={`py-3 px-4 pr-6 ${TABLE_ROW_HOVER_RIGHT}`}>
                      {row.waitlistHref ? (
                        <div className="inline-flex items-center">
                          <Button asChild size="sm" className="h-6 rounded-xs px-2.5 text-[11px]">
                            <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                              Join waitlist
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <CellLink
                          href={row.href}
                          className="inline-flex items-center text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84"
                        >
                          <span>
                            {parseCompactUsdLabel(row.points) == null
                              ? (row.points ?? "—")
                              : compact(parseCompactUsdLabel(row.points) as number)}
                          </span>
                        </CellLink>
                      )}
                    </td>
                    <td className={`py-3 px-4 pr-4 ${TABLE_ROW_HOVER_RIGHT}`}>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 rounded-xs px-2.5 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpenMultiply?.(row.href)
                        }}
                      >
                        Multiply
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-[14px] text-muted-foreground dark:text-white/38"
                  >
                    No loops in this category yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">
            {page + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>
    </section>
  )
}

function MobileLoopCard({
  row,
  protocolLogo,
  assetLogo,
  supplyApy,
  borrowApy,
  availableLabel,
  onOpenMultiply,
}: {
  row: MultiplyPageData["lendRows"][number]
  protocolLogo?: string | null
  assetLogo?: string | null
  supplyApy?: string
  borrowApy?: string
  availableLabel: string
  onOpenMultiply?: (href: string) => void
}) {
  return (
    <Link
      href={row.href}
      className="block rounded-radius-lg border border-border bg-card px-4 py-4 shadow-elev-1 transition-colors hover:border-brand/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-[62px] items-center">
              {protocolLogo ? (
                <div className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={protocolLogo} alt="" aria-hidden="true" className="size-full object-cover" />
                </div>
              ) : null}
              {assetLogo ? (
                <div className="absolute left-5 top-0 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetLogo} alt="" aria-hidden="true" className="size-full object-cover" />
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">{row.protocol}</div>
              <div className="mt-0.5 truncate text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">{row.asset}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "font-data text-[18px] font-medium tabular-nums",
              row.apy ? (row.apy.startsWith("-") ? "text-rose-600 dark:text-rose-400" : "text-success") : "text-foreground",
            )}
          >
            {row.apy || "—"}
          </div>
          <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Max APY</div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-border text-[12.5px]">
        <MobileStatLine label="Max Leverage" value={row.rewardRows?.[1]?.value ?? row.rewardRows?.[0]?.value ?? row.partnerRewards ?? "—"} />
        <MobileStatLine label="Liquidity" value={availableLabel} />
      </dl>

      <div className="mt-3 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
        <MobileInsetStat label="Supply APY" value={supplyApy ?? "—"} tone="text-success" />
        <MobileInsetStat label="Borrow APY" value={borrowApy ?? "—"} tone="text-rose-600 dark:text-rose-400" />
      </div>

      <Button
        type="button"
        className="mt-4 h-10 w-full rounded-full text-[14px]"
        onClick={(event) => {
          event.preventDefault()
          onOpenMultiply?.(row.href)
        }}
      >
        Multiply
      </Button>
    </Link>
  )
}

function TrendingLoopCard({ snapshot }: { snapshot: MultiplyPageData["trendingSnapshots"][number] }) {
  const { compact } = useCurrency()
  const collateralSrc = resolveImageSrc(snapshot.collateralLogo)
  const borrowSrc = resolveImageSrc(snapshot.borrowLogo, snapshot.collateralLogo)

  return (
    <Link
      href={snapshot.href}
      className="group relative block w-full overflow-hidden rounded-radius-lg border border-border bg-surface-raised p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-border/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-100 [background-image:radial-gradient(circle,rgba(148,163,184,0.28)_1px,transparent_1.15px)] [background-position:0_4px] [background-size:16px_16px] dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1.15px)]" />
      <div className="pointer-events-none absolute inset-0 z-0 rounded-radius-lg bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]" />

      {collateralSrc ? (
        <div className="pointer-events-none absolute -left-5 top-16 z-0 size-[274px] rounded-full opacity-10 blur-2xl saturate-150">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collateralSrc} alt="" aria-hidden="true" className="size-full rounded-full object-cover" />
        </div>
      ) : null}

      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center">
          <div className="relative flex h-10 w-[62px] items-center">
            {collateralSrc ? (
              <div className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={collateralSrc} alt="" aria-hidden="true" className="size-full object-cover" />
              </div>
            ) : null}
            {borrowSrc ? (
              <div className="absolute left-5 top-0 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={borrowSrc} alt="" aria-hidden="true" className="size-full object-cover" />
              </div>
            ) : null}
          </div>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--brand-soft))] px-3 text-[13px] font-medium text-brand-readable dark:bg-[hsl(var(--brand-soft))]/20">
          {snapshot.maxLeverageLabel}
        </span>
      </div>

      <div className="relative z-10 space-y-3">
        <h3 className="font-compact text-[15px] font-medium tracking-tight text-foreground">{snapshot.label}</h3>

        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] leading-none text-muted-foreground">APY</span>
            <span className="font-data text-[14px] font-medium tabular-nums leading-none text-success">
              {snapshot.apyLabel}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] leading-none text-muted-foreground">Available</span>
            <span className="font-data text-[14px] font-medium tabular-nums leading-none text-foreground dark:text-white/88">
              {compact(snapshot.availableUsd)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SortIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 16"
      fill="none"
      className="size-[14px] text-muted-foreground/70 dark:text-white/60"
    >
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CellLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("block text-left", className)}>
      {children}
    </Link>
  )
}

function MobileStatLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}

function MobileInsetStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2.5">
      <span className={cn("font-data text-[14px] font-medium tabular-nums text-foreground", tone)}>{value}</span>
      <span className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
    </div>
  )
}

function getResolvedLogo(value?: string | null) {
  return value ? resolveImageSrc(value) : null
}

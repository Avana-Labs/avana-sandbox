"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { TokenIcon } from "@/app/components/token-icon"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/mock/shared/lend"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"

type AssetRow = LendPageData["assetGroups"][number]["rows"][number] & {
  marketId?: string
  supplyApyLabel?: string
  rewardsApyLabel?: string
  totalApyLabel?: string
  supplyApyValue?: number
  rewardsApyValue?: number
  utilizationLabel?: string
  utilizationValue?: number
  reserveFactorLabel?: string
  reserveFactorValue?: number
  status?: string
}
type AssetGroup = LendPageData["assetGroups"][number]
const DEFAULT_ASSET_GROUPS: AssetGroup[] = LEND_ASSET_GROUPS
const STABLE_SYMBOLS = new Set(DEFAULT_ASSET_GROUPS[0]?.rows.map((row) => row.symbol) ?? [])
const ALL_HUBS_LABEL = "All Hubs"
const ALL_MARKETS_LABEL = "All Markets"
const HUB_OPTIONS = ["Stable", "Volatile"]
const MARKET_OPTIONS = DEFAULT_ASSET_GROUPS.map((group) => group.title)
const ROW_HOVER_BG = "transition-colors group-hover:bg-table-header/40 dark:group-hover:bg-[#131820]"
const ROW_HOVER_LEFT = `${ROW_HOVER_BG} group-hover:rounded-l-2xl`
const ROW_HOVER_RIGHT = `${ROW_HOVER_BG} group-hover:rounded-r-2xl`

function getHubBucket(row: AssetRow) {
  return STABLE_SYMBOLS.has(row.symbol) ? "Stable" : "Volatile"
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6 text-[#01AACF]">
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className="size-[14px] text-muted-foreground/70 dark:text-white/60">
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 14" fill="none" className="size-3.5 text-current">
      <path d="M3 4.5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 9.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FilterCheckIcon({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked
          ? "border-[#01AACF] bg-[#01AACF] text-white"
          : "border-black/35 bg-transparent text-transparent dark:border-white/55",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" className="size-3">
        <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function MultiSelectDropdown({
  allLabel,
  countLabel,
  options,
  selectedValues,
  onChange,
  ariaLabel,
}: {
  allLabel: string
  countLabel: string
  options: string[]
  selectedValues: string[]
  onChange: (nextValues: string[]) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [panelStyle, setPanelStyle] = useState<{
    left: number
    top: number
    width: number
    maxHeight: number
  } | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length
  const triggerLabel = isAllSelected ? allLabel : `${countLabel} (${selectedValues.length})`

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => document.removeEventListener("pointerdown", handlePointerDown, true)
  }, [open])

  useEffect(() => {
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

  const toggleOption = (option: string, checked: boolean) => {
    if (!checked) {
      const nextValues = selectedValues.filter((value) => value !== option)
      onChange(nextValues)
      return
    }

    onChange(Array.from(new Set([...selectedValues, option])))
  }

  return (
    <div ref={rootRef} className="relative z-20">
      <button
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium tracking-[-0.03em] shadow-elev-1 outline-none transition-colors focus-visible:ring-2 md:h-10 md:px-4 md:text-[14px]",
          "border border-border bg-card text-foreground hover:bg-neutral-50 focus-visible:ring-black/10 dark:border-white/8 dark:text-white dark:hover:bg-[#262626] dark:focus-visible:ring-white/10",
        )}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <span className="text-foreground/70 dark:text-white/80">
          <ChevronDownIcon />
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
              "fixed z-30 overflow-hidden rounded-[18px] border shadow-[0_22px_44px_rgba(0,0,0,0.24)]",
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
                onChange([])
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium tracking-[-0.03em] transition-colors md:h-11 md:px-4 md:text-[14px]",
                "text-foreground hover:bg-black/[0.04] dark:text-white dark:hover:bg-card/5",
              )}
            >
              <FilterCheckIcon checked={isAllSelected} />
              <span>{allLabel}</span>
            </button>

            <div
              className={cn(
                "w-full border-t",
                "border-black/12 dark:border-white/20",
              )}
            />

            <div className="overflow-y-auto py-1 pb-3" style={panelStyle ? { maxHeight: panelStyle.maxHeight - 41 } : undefined}>
              {options.map((option) => {
                const checked = selectedValues.includes(option)

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option, !checked)}
                    className={cn(
                      "flex h-9 w-full items-center gap-3 px-3.5 text-left text-[13px] tracking-[-0.03em] transition-colors",
                      checked
                        ? "bg-black/[0.05] font-medium text-foreground dark:bg-card/6 dark:text-white"
                        : "text-foreground/82 hover:bg-black/[0.04] dark:text-white/82 dark:hover:bg-card/5",
                    )}
                  >
                    <FilterCheckIcon checked={checked} />
                    <span className="truncate">{option}</span>
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

function AssetIcon({ row }: { row: AssetRow }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={row.logoSrc}
          width={40}
          height={40}
          className="h-full w-full object-contain"
          unoptimized
        />
      </span>
    )
  }

  return <TokenIcon symbol={row.symbol} size="table" ring className="bg-card dark:bg-card" />
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? "active").toLowerCase()
  const tone =
    normalized === "active"
      ? "border-emerald-200/70 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400"
      : normalized === "capped"
        ? "border-amber-200/70 bg-amber-500/10 text-amber-800 dark:border-amber-900/50 dark:text-amber-300"
        : "border-border bg-surface-inset text-muted-foreground"

  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", tone)}>
      {normalized}
    </span>
  )
}

function AssetRowView({
  row,
  delay,
  index,
  onDeposit,
}: {
  row: AssetRow
  delay: number
  index: number
  onDeposit?: (marketId: string) => void
}) {
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  return (
    <tr
      className="asset-swap group transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <td className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${ROW_HOVER_LEFT}`}>
        {index + 1}
      </td>
      <td className={`py-3 pl-6 pr-4 ${ROW_HOVER_BG}`}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88 md:text-[14px]">
              {row.name}
            </div>
            <div className="mt-0.5 text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38 md:text-[12px]">
              {row.symbol}
            </div>
          </div>
        </div>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.supplyApyLabel ?? row.apy}</span>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.rewardsApyLabel ?? "0.00%"}</span>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.utilizationLabel ?? "—"}</span>
      </td>

      <td className={`py-3 px-4 text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 md:text-[14px] ${ROW_HOVER_BG}`}>
        <span className="tabular-nums">{row.reserveFactorLabel ?? "—"}</span>
      </td>

      <td className={`py-3 px-4 ${ROW_HOVER_BG}`}>
        <StatusBadge status={row.status} />
      </td>

      <td className={`py-3 px-4 pr-4 ${ROW_HOVER_RIGHT}`}>
        {onDeposit ? (
          <Button type="button" size="sm" className="h-7 rounded-xs px-2.5 text-[11px]" onClick={() => onDeposit(marketId)}>
            Deposit
          </Button>
        ) : null}
      </td>
    </tr>
  )
}

function AssetSection({
  title,
  subtitle,
  rows,
  onDeposit,
}: {
  title: string
  subtitle?: string
  rows: AssetRow[]
  onDeposit?: (marketId: string) => void
}) {
  const [sortKey, setSortKey] = useState<
    "asset" | "supplyApy" | "rewardsApy" | "utilization" | "reserveFactor" | "status"
  >("asset")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "asset" ? "asc" : "desc")
  }

  const sortedRows = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "supplyApy":
          return ((a.supplyApyValue ?? a.apyValue / 100) - (b.supplyApyValue ?? b.apyValue / 100)) * direction
        case "rewardsApy":
          return ((a.rewardsApyValue ?? 0) - (b.rewardsApyValue ?? 0)) * direction
        case "utilization":
          return ((a.utilizationValue ?? 0) - (b.utilizationValue ?? 0)) * direction
        case "reserveFactor":
          return ((a.reserveFactorValue ?? 0) - (b.reserveFactorValue ?? 0)) * direction
        case "status":
          return (a.status ?? "active").localeCompare(b.status ?? "active") * direction
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [rows, sortDirection, sortKey])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-[13px] text-muted-foreground dark:text-white/44">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-radius-md bg-transparent">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 text-[12px]">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[22%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                <th className="rounded-l-2xl bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  #
                </th>
                <th className="bg-table-header px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort("asset")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "asset"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>ASSET</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("supplyApy")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "supplyApy"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>SUPPLY APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("rewardsApy")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "rewardsApy"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>REWARDS APY</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("utilization")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "utilization"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>UTILIZATION</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("reserveFactor")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "reserveFactor"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>RESERVE FACTOR</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="bg-table-header px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className={cn(
                      "flex items-center gap-2 transition-colors",
                      sortKey === "status"
                        ? "text-foreground dark:text-white/90"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>STATUS</span>
                    <SortIcon />
                  </button>
                </th>
                <th className="rounded-r-2xl bg-table-header px-4 py-3.5 pr-4 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/70">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody key={`${title}-${sortKey}-${sortDirection}`} className="divide-y divide-border dark:divide-white/6">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetRowView key={row.symbol} row={row} delay={index * 40} index={index} onDeposit={onDeposit} />
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60" colSpan={8}>
                    No assets match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function LendAssetSpokes({
  groups = DEFAULT_ASSET_GROUPS,
  onDeposit,
}: {
  groups?: LendPageData["assetGroups"]
  onDeposit?: (marketId: string) => void
}) {
  const [search, setSearch] = useState("")
  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return groups.map((group) => {
      const matchesMarketGroup = selectedMarkets.length === 0 || selectedMarkets.includes(group.title)
      const rows = group.rows.filter((row) => {
        const matchesSearch =
          query.length === 0 ||
          row.name.toLowerCase().includes(query) ||
          row.symbol.toLowerCase().includes(query)
        const matchesHub = selectedHubs.length === 0 || selectedHubs.includes(getHubBucket(row))
        const matchesMarket = matchesMarketGroup
        return matchesSearch && matchesHub && matchesMarket
      })

      return { ...group, rows }
    }).filter((group) => group.rows.length > 0)
  }, [groups, search, selectedHubs, selectedMarkets])

  return (
    <section className="mt-16 space-y-8" style={{ overflowAnchor: "none" }}>
      <div className="hidden items-center gap-2 py-2.5 md:flex">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-border/60 dark:text-[#e6f8fb] dark:focus-within:border-[#01AACF]/30 md:flex-none md:w-[280px]">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter assets"
            className="lend-filter-input w-full bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/45 md:text-[15px] md:font-normal"
          />
        </label>

        <div className="ml-auto flex min-w-0 flex-nowrap gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel="Hubs"
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel="Filter hubs"
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel="Markets"
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel="Filter markets"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-2.5 md:hidden">
        <label className="flex h-10 min-w-[11rem] flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground shadow-elev-1 transition-colors focus-within:border-foreground/20 dark:border-border/60 dark:text-[#e6f8fb] dark:focus-within:border-[#01AACF]/30">
          <SearchIcon />
          <input
            aria-label="Filter assets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter assets"
            className="w-full min-w-0 bg-transparent text-[13px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/45"
          />
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <MultiSelectDropdown
            allLabel={ALL_HUBS_LABEL}
            countLabel="Hubs"
            options={HUB_OPTIONS}
            selectedValues={selectedHubs}
            onChange={setSelectedHubs}
            ariaLabel="Filter hubs"
          />

          <MultiSelectDropdown
            allLabel={ALL_MARKETS_LABEL}
            countLabel="Markets"
            options={MARKET_OPTIONS}
            selectedValues={selectedMarkets}
            onChange={setSelectedMarkets}
            ariaLabel="Filter markets"
          />
        </div>
      </div>

      <div className="space-y-14">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <div key={group.title} className="space-y-8">
              <AssetSection
                title={group.title}
                subtitle={group.subtitle}
                rows={group.rows}
                onDeposit={onDeposit}
              />
              {group.title === "Ethereum-Based" ? (
                <div className="flex justify-center">
                  <div className="h-px w-full max-w-[980px] bg-gradient-to-r from-transparent via-border/80 to-transparent dark:via-white/10" />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-radius-md border-0 bg-card px-6 py-10 text-[13px] text-muted-foreground shadow-none">
            No assets match these filters.
          </div>
        )}
      </div>
    </section>
  )
}

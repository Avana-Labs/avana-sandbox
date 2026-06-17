"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { LEND_ROWS, TOKEN_BORROW_APYS, TOKEN_LOGOS, TOKEN_SUPPLY_APYS } from "./multiply-lend-section"

const BTC_SYMBOLS = new Set(["WBTC", "CBBTC", "BTC"])
const ETH_SYMBOLS = new Set(["ETH", "WETH", "STETH", "WSTETH", "RETH", "CBETH", "WEETH"])
const FOREX_SYMBOLS = new Set(["USDC", "USDT", "DAI", "CRVUSD", "GHO", "EURC", "USD+", "SDAI", "FRAX", "USDE", "USDS", "USDP", "LUSD", "TUSD", "MIM", "PYUSD", "EURS"])
const UTILITY_SYMBOLS = new Set(["AAVE", "UNI", "CRV", "LDO", "BAL", "AURA", "GNO", "ARB", "OP", "LINK", "MKR"])

const CATEGORY_TABS = [
  { id: "all-markets", label: "All" },
  { id: "btc", label: "BTC Based" },
  { id: "eth", label: "ETH Based" },
  { id: "forex", label: "Forex Based" },
  { id: "governance", label: "Utility Based" },
  { id: "smart-loops", label: "Smart Loops" },
] as const

type MultiplyCategoryTabId = (typeof CATEGORY_TABS)[number]["id"]

function SearchIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={cn("size-6 text-muted-foreground/70 dark:text-white/40", className)}>
      <path d="m21 21-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ExpandableDesktopSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (nextValue: string) => void
}) {
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
          isExpanded ? "w-[240px] rounded-[12px] px-3" : "w-10 cursor-pointer justify-center rounded-[12px]",
          "border-border bg-white text-foreground dark:border-white/7 dark:bg-[#111111] dark:text-white/96",
        )}
        onClick={() => {
          if (!isExpanded) setOpen(true)
        }}
      >
        <button
          type="button"
          aria-label="Search loops"
          className={cn("flex shrink-0 items-center justify-center", isExpanded ? "pointer-events-none mr-2 size-5" : "size-10")}
          onClick={() => setOpen(true)}
        >
          <SearchIcon className={cn(isExpanded ? "size-5" : "size-6")} />
        </button>

        {isExpanded ? (
          <input
            ref={inputRef}
            aria-label="Search loops"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search loops"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-normal tracking-[-0.03em] outline-none placeholder:text-muted-foreground/65 dark:placeholder:text-white/35"
          />
        ) : null}
      </div>
    </div>
  )
}

export function ExploreLoopsMarketsTable() {
  const [currentTab, setCurrentTab] = React.useState<MultiplyCategoryTabId>("all-markets")
  const [search, setSearch] = React.useState("")
  const searchQuery = search.trim().toLowerCase()
  const buildSearchText = (row: (typeof LEND_ROWS)[number]) =>
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
    const hasAnySymbol = (symbols: Set<string>, ...values: string[]) => values.some((value) => symbols.has(value.toUpperCase()))

    return LEND_ROWS.filter((row) => {
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

      if (currentTab === "all-markets") return true
      if (currentTab === "btc") return matchesBtc
      if (currentTab === "eth") return matchesEth
      if (currentTab === "forex") return matchesForex
      if (currentTab === "governance") return matchesUtility
      if (currentTab === "smart-loops") return matchesSmartLoop
      return true
      })
      .filter((row) => searchQuery.length === 0 || buildSearchText(row).includes(searchQuery))
  }, [currentTab, searchQuery])

  const sectionedRows = React.useMemo(() => {
    const sections = [
      { title: "Stablecoins", rows: [] as (typeof LEND_ROWS)[number][] },
      { title: "Ethereum-Based", rows: [] as (typeof LEND_ROWS)[number][] },
      { title: "Bitcoin Based", rows: [] as (typeof LEND_ROWS)[number][] },
      { title: "Other Assets", rows: [] as (typeof LEND_ROWS)[number][] },
    ]

    const isStable = (symbol: string) => FOREX_SYMBOLS.has(symbol.toUpperCase())
    const isEth = (symbol: string) => ETH_SYMBOLS.has(symbol.toUpperCase())
    const isBtc = (symbol: string) => BTC_SYMBOLS.has(symbol.toUpperCase())

    for (const row of filteredRows) {
      const protocol = row.protocol
      if (isStable(protocol)) {
        sections[0].rows.push(row)
      } else if (isEth(protocol)) {
        sections[1].rows.push(row)
      } else if (isBtc(protocol)) {
        sections[2].rows.push(row)
      } else {
        sections[3].rows.push(row)
      }
    }

    return sections.filter((section) => section.rows.length > 0)
  }, [filteredRows])

  const getAssetLogo = (asset: string) => TOKEN_LOGOS[asset as keyof typeof TOKEN_LOGOS]
  const getSupplyApy = (asset: string) => TOKEN_SUPPLY_APYS[asset as keyof typeof TOKEN_SUPPLY_APYS]
  const getBorrowApy = (asset: string) => TOKEN_BORROW_APYS[asset as keyof typeof TOKEN_BORROW_APYS]
  const trendingRows = React.useMemo(() => {
    const parsePct = (value?: string) => Number.parseFloat(value?.replace("%", "") ?? "")
    const parseLeverage = (value?: string) => Number.parseFloat(value?.replace("x", "") ?? "")

    return [...LEND_ROWS]
      .filter((row) => parseLeverage(row.rewardRows?.[0]?.value) > 8)
      .sort((a, b) => {
        const apyDiff = parsePct(b.apy) - parsePct(a.apy)
        if (apyDiff !== 0) return apyDiff
        return parseLeverage(b.rewardRows?.[0]?.value) - parseLeverage(a.rewardRows?.[0]?.value)
      })
      .slice(0, 4)
  }, [])

  return (
    <section className="mt-6 space-y-5">
      <div>
        <div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">Trending</h2>
        </div>
      </div>

      <div className="pb-1">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trendingRows.map((row) => (
            <TrendingLoopCard
              key={`${row.protocol}-${row.asset}`}
              row={row}
              borrowLogo={getAssetLogo(row.asset)}
            />
          ))}
        </div>
      </div>

      <div aria-hidden className="h-1" />

      <div className="flex items-center gap-4">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-6 py-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id)}
                className={cn(
                  "whitespace-nowrap text-[20px] font-normal tracking-[-0.03em] transition-colors md:text-[22px]",
                  currentTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ExpandableDesktopSearch value={search} onChange={setSearch} />
        </div>
      </div>

      <div className="space-y-8">
        {sectionedRows.map((section) => (
            <MarketSectionTable
              key={section.title}
              title={section.title}
              rows={section.rows}
              getSupplyApy={getSupplyApy}
              getBorrowApy={getBorrowApy}
              getAssetLogo={getAssetLogo}
          />
        ))}
      </div>
    </section>
  )
}

function MarketSectionTable({
  title,
  rows,
  getSupplyApy,
  getBorrowApy,
  getAssetLogo,
}: {
  title: string
  rows: (typeof LEND_ROWS)[number][]
  getSupplyApy: (asset: string) => string | undefined
  getBorrowApy: (asset: string) => string | undefined
  getAssetLogo: (asset: string) => string | undefined
}) {
  const [sortKey, setSortKey] = React.useState<"protocol" | "asset" | "apy" | "rewards" | "points">("rewards")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")

  const toggleSort = (nextKey: typeof sortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === "protocol" || nextKey === "asset" ? "asc" : "desc")
  }

  const sortedRows = React.useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1
    const parseValue = (value?: string) => {
      if (!value) return Number.NEGATIVE_INFINITY
      const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ""))
      return Number.isFinite(numeric) ? numeric : Number.NEGATIVE_INFINITY
    }

    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "asset":
          return a.asset.localeCompare(b.asset) * direction
        case "apy":
          return (parseValue(a.apy) - parseValue(b.apy)) * direction
        case "rewards":
          return (
            parseValue(a.rewardRows?.[1]?.value ?? a.rewardRows?.[0]?.value ?? a.partnerRewards) -
            parseValue(b.rewardRows?.[1]?.value ?? b.rewardRows?.[0]?.value ?? b.partnerRewards)
          ) * direction
        case "points":
          return (parseValue(a.points) - parseValue(b.points)) * direction
        case "protocol":
        default:
          return a.protocol.localeCompare(b.protocol) * direction
      }
    })
  }, [rows, sortDirection, sortKey])

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {title}
          </h2>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="overflow-hidden rounded-[20px] border border-border bg-surface-raised shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid min-w-[920px] grid-cols-[24%_22%_18%_18%_18%] text-left text-muted-foreground">
              <HeaderSortButton
                label="Collateral"
                active={sortKey === "protocol"}
                direction={sortKey === "protocol" ? sortDirection : undefined}
                onClick={() => toggleSort("protocol")}
                className="pl-6"
              />
              <HeaderSortButton
                label="Borrowable"
                active={sortKey === "asset"}
                direction={sortKey === "asset" ? sortDirection : undefined}
                onClick={() => toggleSort("asset")}
                className="px-4"
              />
              <HeaderSortButton
                label="Max APY"
                active={sortKey === "apy"}
                direction={sortKey === "apy" ? sortDirection : undefined}
                onClick={() => toggleSort("apy")}
                className="px-4"
              />
              <HeaderSortButton
                label="Max Leverage"
                active={sortKey === "rewards"}
                direction={sortKey === "rewards" ? sortDirection : undefined}
                onClick={() => toggleSort("rewards")}
                className="px-4"
              />
              <HeaderSortButton
                label="Available"
                active={sortKey === "points"}
                direction={sortKey === "points" ? sortDirection : undefined}
                onClick={() => toggleSort("points")}
                className="px-4 pr-6"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedRows.length ? (
          sortedRows.map((row, index) => (
            <MarketSectionRow
              key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
              row={row}
              getSupplyApy={getSupplyApy}
              getBorrowApy={getBorrowApy}
              getAssetLogo={getAssetLogo}
            />
          ))
        ) : (
          <div className="rounded-[20px] border border-border bg-surface-raised px-6 py-10 text-center text-[14px] text-muted-foreground shadow-sm">
            No loops in this category yet.
          </div>
        )}
      </div>
    </section>
  )
}

function HeaderSortButton({
  label,
  active,
  direction,
  onClick,
  className,
}: {
  label: string
  active: boolean
  direction?: "asc" | "desc"
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 pb-3 pt-4 text-[10.5px] font-medium uppercase tracking-[0.06em] transition-colors",
        active ? "text-foreground dark:text-white/90" : "text-muted-foreground dark:text-white/58",
        className,
      )}
    >
      <span>{label}</span>
      <SortIcon direction={direction} />
    </button>
  )
}

function SortIcon({ direction }: { direction?: "asc" | "desc" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className={cn("size-[12px]", direction === "asc" ? "rotate-180" : "")}>
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MarketSectionRow({
  row,
  getSupplyApy,
  getBorrowApy,
  getAssetLogo,
}: {
  row: (typeof LEND_ROWS)[number]
  getSupplyApy: (asset: string) => string | undefined
  getBorrowApy: (asset: string) => string | undefined
  getAssetLogo: (asset: string) => string | undefined
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface-raised shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-surface-inset/40">
      <div className="grid gap-0 md:grid-cols-[24%_22%_18%_18%_18%]">
        <MarketMetric value={row.protocol} subValue={getSupplyApy(row.protocol) ?? "—"} logo={row.protocolLogo} className="px-6 py-2.5" />
        <MarketMetric value={row.asset} subValue={getBorrowApy(row.asset) ?? "—"} logo={getAssetLogo(row.asset)} className="px-4 py-2.5" />
        <MarketMetric value={row.apy || "—"} tone={row.apy && row.apy.startsWith("-") ? "negative" : "positive"} dense className="px-4 py-2.5" />
        <MarketMetric
          value={row.rewardRows?.[1]?.value ?? row.rewardRows?.[0]?.value ?? row.partnerRewards ?? "—"}
          subValue={row.rewardRows?.[1]?.label ?? row.rewardRows?.[0]?.label ?? " "}
          dense
          className="px-4 py-2.5"
        />
        <MarketMetric
          value={row.waitlistHref ? "Waitlist" : row.points ?? "—"}
          subValue={row.waitlistHref ? "Not open yet" : " "}
          tone={row.waitlistHref ? "neutral" : "default"}
          cta={row.waitlistHref ? "Join waitlist" : undefined}
          dense
          className="px-4 py-2.5 pr-6"
        />
      </div>
    </div>
  )
}

function MarketMetric({
  value,
  subValue,
  tone = "default",
  logo,
  cta,
  dense = false,
  className,
}: {
  value: string
  subValue?: string
  tone?: "default" | "positive" | "negative" | "neutral"
  logo?: string
  cta?: string
  dense?: boolean
  className?: string
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "neutral"
          ? "text-muted-foreground"
          : "text-foreground"

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-2">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" aria-hidden="true" className="size-11 shrink-0 rounded-full bg-card object-cover ring-2 ring-background" />
        ) : null}
        <div className="min-w-0">
          <div
            className={cn(
              "truncate tracking-[-0.03em]",
              dense
                ? "text-[15px] font-normal tabular-nums text-foreground dark:text-white/84"
                : "text-[15px] font-medium text-foreground dark:text-white/88",
              valueClass,
            )}
          >
            {value}
          </div>
          {subValue ? (
            <div className="mt-1 truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
              {subValue}
            </div>
          ) : null}
          {cta ? <div className="mt-0.5 text-[12px] font-medium text-[#01AACF]">{cta}</div> : null}
        </div>
      </div>
    </div>
  )
}

function TrendingLoopCard({
  row,
  borrowLogo,
}: {
  row: (typeof LEND_ROWS)[number]
  borrowLogo?: string
}) {
  const leverage = row.rewardRows?.[0]?.value ?? "—"
  return (
    <Link
      href={row.href}
      className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-surface-raised p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-border/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)]"
    >
      <div className="pointer-events-none absolute -left-5 top-16 size-[274px] rounded-full opacity-10 blur-2xl saturate-150">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={row.protocolLogo} alt="" aria-hidden="true" className="size-full rounded-full object-cover" />
      </div>

      <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center">
          <div className="relative flex h-10 w-[62px] items-center">
            <div className="absolute left-0 top-0 z-10 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.protocolLogo} alt="" aria-hidden="true" className="size-full object-cover" />
            </div>
            <div className="absolute left-5 top-0 flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={borrowLogo ?? row.protocolLogo} alt="" aria-hidden="true" className="size-full object-cover" />
            </div>
          </div>
        </div>
        <span className="inline-flex h-8 items-center rounded-full bg-[hsl(var(--brand-soft))] px-3 text-[13px] font-medium text-[hsl(var(--brand))] dark:bg-[hsl(var(--brand-soft))]/20">
          {leverage}
        </span>
      </div>

      <div className="relative z-10 space-y-3">
        <h3 className="font-compact text-[15px] font-medium tracking-tight text-foreground">{row.protocol}-{row.asset}</h3>

        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] leading-none text-muted-foreground">APY</span>
            <span
              className={cn(
                "font-data text-[14px] font-medium tabular-nums leading-none",
                row.apy.startsWith("-") ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {row.apy}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] leading-none text-muted-foreground">Available</span>
            <span className="font-data text-[14px] font-medium tabular-nums leading-none text-foreground dark:text-white/88">
              {row.points ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

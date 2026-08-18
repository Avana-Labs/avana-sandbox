"use client"

import * as React from "react"
import { ActionIcon } from "@/app/components/action-icon"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CarouselArrowButtons } from "@/app/components/carousel-arrow-buttons"
import {
  HIGHLIGHT_CARD_CLASS,
  HighlightCarousel,
  type HighlightCarouselHandle,
} from "@/app/components/highlight-carousel"
import { hasImageSrc, resolveImageSrc } from "@/lib/image-src"
import { resolveMultiplyTokenLogo } from "@/lib/multiply-token-logo"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, categorizeMarket, type CategoryChip } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { RevealSentinel, useProgressiveReveal } from "@/app/lib/ui/use-progressive-reveal"

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

// Loop markets are grouped by their collateral asset's family, mirroring the Lend
// page's grouped asset tables (Stablecoins → Ethereum → Bitcoin → Other). Utility
// and Smart collateral both fall into "Other Assets".
type LoopGroupKey = "forex" | "eth" | "btc" | "other"

const LOOP_GROUP_ORDER: Array<{ key: LoopGroupKey; title: string }> = [
  { key: "forex", title: "Stablecoins" },
  { key: "eth", title: "Ethereum-Based" },
  { key: "btc", title: "Bitcoin Based" },
  { key: "other", title: "Other Assets" },
]

function loopGroupKey(collateralSymbol: string): LoopGroupKey {
  const category = categorizeMarket(collateralSymbol)
  return category === "forex" || category === "eth" || category === "btc" ? category : "other"
}

// Pure, row-only — hoisted out of the component so it isn't reallocated every render and
// can be memoised per `rows` instead of recomputed for every row on every keystroke.
function buildLoopSearchText(row: MultiplyPageData["lendRows"][number]): string {
  return [
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
}

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

type MultiplyCategoryTabId = CategoryChip["id"]

type LoopSortKey = "protocol" | "asset" | "apy" | "rewards" | "cf" | "points"

function parseCompactUsdLabel(value?: string) {
  if (!value) return null
  const match = value.trim().match(/^\$?([\d,.]+)([KMB])?$/i)
  if (!match) return null
  const amount = Number.parseFloat(match[1].replace(/,/g, ""))
  if (!Number.isFinite(amount)) return null
  const suffix = match[2]?.toUpperCase()
  return amount * (suffix === "B" ? 1e9 : suffix === "M" ? 1e6 : suffix === "K" ? 1e3 : 1)
}

function resolveMarketIdFromHref(href: string) {
  return href.split("/").pop() ?? ""
}

type ExploreLoopsMarketsTableProps = {
  initialIsDesktop?: boolean
  rows: MultiplyPageData["lendRows"]
  trendingSnapshots: MultiplyPageData["trendingSnapshots"]
  pageSize: MultiplyPageData["pageSize"]
  tokenLogos: MultiplyPageData["tokenLogos"]
  onOpenMultiply?: (href: string) => void
}

export function paginateMultiplyRows<T>(rows: readonly T[], page: number, pageSize: number) {
  const safeSize = Math.max(1, pageSize)
  const start = Math.max(0, page) * safeSize
  return rows.slice(start, start + safeSize)
}

export function isNegativeMultiplyApy(apy?: string) {
  if (!apy) return false
  const value = Number.parseFloat(apy.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(value) && value < 0
}

export function ExploreLoopsMarketsTable({
  initialIsDesktop = true,
  pageSize,
  rows,
  trendingSnapshots,
  tokenLogos,
}: ExploreLoopsMarketsTableProps) {
  const { t } = useTranslation()
  const [currentTab, setCurrentTab] = React.useState<MultiplyCategoryTabId>("all")
  const [search, setSearch] = React.useState("")
  const searchQuery = search.trim().toLowerCase()

  // Compute each row's searchable text ONCE per `rows` change (keyed by row identity),
  // instead of rebuilding it for every row on every keystroke.
  const searchTextByRow = React.useMemo(() => {
    const map = new Map<(typeof rows)[number], string>()
    for (const row of rows) map.set(row, buildLoopSearchText(row))
    return map
  }, [rows])

  // Cheap category filter — recomputes only when the tab (or rows) change, so typing in
  // search no longer re-runs it. The "all" tab short-circuits to the full list.
  const categoryFilteredRows = React.useMemo(() => {
    if (currentTab === "all") return rows
    const hasAnySymbol = (symbols: Set<string>, ...values: string[]) =>
      values.some((value) => symbols.has(value.toUpperCase()))
    return rows.filter((row) => {
      const protocol = row.protocol.toUpperCase()
      const asset = row.asset.toUpperCase()
      if (currentTab === "btc") return hasAnySymbol(BTC_SYMBOLS, protocol, asset)
      if (currentTab === "eth") return hasAnySymbol(ETH_SYMBOLS, protocol, asset)
      if (currentTab === "forex") return hasAnySymbol(FOREX_SYMBOLS, protocol) && hasAnySymbol(FOREX_SYMBOLS, asset)
      if (currentTab === "utility") return hasAnySymbol(UTILITY_SYMBOLS, protocol, asset)
      if (currentTab === "smart") {
        return (
          (hasAnySymbol(ETH_SYMBOLS, protocol) && hasAnySymbol(ETH_SYMBOLS, asset)) ||
          (hasAnySymbol(FOREX_SYMBOLS, protocol) && hasAnySymbol(FOREX_SYMBOLS, asset)) ||
          (hasAnySymbol(BTC_SYMBOLS, protocol) && hasAnySymbol(BTC_SYMBOLS, asset))
        )
      }
      return true
    })
  }, [currentTab, rows])

  // Search filter runs over the already-category-filtered set using the precomputed text —
  // the only work a keystroke triggers now.
  const filteredRows = React.useMemo(() => {
    if (searchQuery.length === 0) return categoryFilteredRows
    return categoryFilteredRows.filter((row) => (searchTextByRow.get(row) ?? "").includes(searchQuery))
  }, [categoryFilteredRows, searchQuery, searchTextByRow])

  const effectivePageSize = Math.max(1, pageSize || 12)

  // Reveal rows on scroll instead of paginating: only the first chunk renders up
  // front, then the sentinel eases in the rest as the user scrolls down.
  const { visibleCount, hasMore, isRevealing, sentinelRef } = useProgressiveReveal({
    total: filteredRows.length,
    chunkSize: effectivePageSize,
    resetKey: `${currentTab}|${searchQuery}`,
  })
  const revealedRows = React.useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount])

  // Bucket the revealed rows into the ordered collateral-family groups, dropping
  // any empty group — the same grouped-table treatment the Lend page uses.
  const groupedSections = React.useMemo(() => {
    const buckets: Record<LoopGroupKey, Array<MultiplyPageData["lendRows"][number]>> = {
      forex: [],
      eth: [],
      btc: [],
      other: [],
    }
    for (const row of revealedRows) buckets[loopGroupKey(row.protocol)].push(row)
    return LOOP_GROUP_ORDER.map((group) => ({ title: group.title, rows: buckets[group.key] })).filter(
      (group) => group.rows.length > 0,
    )
  }, [revealedRows])

  const carouselRef = React.useRef<HighlightCarouselHandle>(null)

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Trending")}
        </h2>
        <CarouselArrowButtons
          canPrev
          canNext
          onPrev={() => carouselRef.current?.step(-1)}
          onNext={() => carouselRef.current?.step(1)}
          prevLabel="Previous trending"
          nextLabel="Next trending"
        />
      </div>

      <HighlightCarousel
        ref={carouselRef}
        className="mt-5 h-[104px]"
        renderSequence={(interactive) =>
          trendingSnapshots.map((snapshot, index) => (
            <TrendingLoopCard
              key={`${interactive ? "a" : "b"}-${snapshot.marketId}-${index}`}
              snapshot={snapshot}
              interactive={interactive}
            />
          ))
        }
      />

      <MarketFilterBar
        className="mt-11"
        chips={CATEGORY_TABS}
        tab={currentTab}
        onTabChange={setCurrentTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("Search loops")}
      />

      <div className="mt-[68px] space-y-14">
        {groupedSections.length > 0 ? (
          groupedSections.map((group) => (
            <div key={group.title} className="space-y-8">
              <LoopMarketsSection
                initialIsDesktop={initialIsDesktop}
                title={group.title}
                rows={group.rows}
                tokenLogos={tokenLogos}
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
            {t("No loops in this category yet.")}
          </div>
        )}
      </div>

      {hasMore ? (
        <RevealSentinel
          sentinelRef={sentinelRef}
          active={isRevealing}
          className="mt-10 flex items-center justify-center py-8"
        />
      ) : null}
    </section>
  )
}

function LoopMarketsSection({
  initialIsDesktop,
  title,
  rows,
  tokenLogos,
}: {
  initialIsDesktop: boolean
  title: string
  rows: MultiplyPageData["lendRows"]
  tokenLogos: MultiplyPageData["tokenLogos"]
}) {
  const { t } = useTranslation()
  const { compact } = useCurrency()
  const isDesktop = useMediaQuery("(min-width: 768px)", initialIsDesktop, true)
  const [sortKey, setSortKey] = React.useState<LoopSortKey>("protocol")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")

  const toggleSort = (nextKey: LoopSortKey) => {
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
            (parseValue(a.rewardRows?.[0]?.value ?? a.partnerRewards) -
              parseValue(b.rewardRows?.[0]?.value ?? b.partnerRewards)) *
            direction
          )
        case "cf":
          return (a.collateralFactor - b.collateralFactor) * direction
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
      {/* Sticky like the Lend spoke headers: each group title hangs under the site
          header while its own table scrolls, then the next group's title takes over. */}
      <div className="sticky top-16 z-20 flex flex-col gap-3 bg-background py-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]">
            {t(title)}
          </h2>
        </div>
      </div>

      <DesktopTableSurface className="!rounded-none [contain-intrinsic-size:auto_640px] [content-visibility:auto]">
        {!isDesktop ? (
          <div className="space-y-4">
            {sortedRows.length ? (
              sortedRows.map((row, index) => (
                <MobileLoopCard
                  key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                  row={row}
                  index={index}
                  protocolLogo={getResolvedLogo(row.protocolLogo)}
                  assetLogo={getResolvedLogo(
                    tokenLogos[row.asset as keyof typeof tokenLogos] ?? resolveMultiplyTokenLogo(row.asset),
                  )}
                  availableLabel={
                    parseCompactUsdLabel(row.points) == null
                      ? (row.points ?? "—")
                      : compact(parseCompactUsdLabel(row.points) as number)
                  }
                />
              ))
            ) : (
              <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground shadow-elev-1">
                {t("No loops in this category yet.")}
              </div>
            )}
          </div>
        ) : null}

        {isDesktop ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] table-fixed border-separate border-spacing-0 text-[12px] lg:min-w-full">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="bg-table-header text-left text-muted-foreground">
                    <th className="bg-table-header pb-2 pl-6 pr-3 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      #
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("protocol")}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "protocol"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("Pool")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("asset")}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "asset"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("Borrowable")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("apy")}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "apy"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("APY")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("rewards")}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "rewards"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("Leverage")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("cf")}
                        className={cn(
                          "flex items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "cf"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("CF")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pr-6 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("points")}
                        className={cn(
                          "flex w-full items-center gap-2 whitespace-nowrap transition-colors",
                          sortKey === "points"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("Available")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-2 pr-5 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
                  </tr>
                </thead>
                <tbody
                  key={`${title}-${sortKey}-${sortDirection}`}
                  className="divide-y divide-border dark:divide-white/6"
                >
                  {sortedRows.map((row, index) => (
                    <LoopTableRow
                      key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                      row={row}
                      index={index}
                      tokenLogos={tokenLogos}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DesktopTableSurface>
    </section>
  )
}

// Memoized so an unchanged row doesn't re-render when a sibling row changes (e.g. a
// re-sort or a keystroke that leaves this row's props identical). Props are stable
// references (row, tokenLogos) plus a primitive index; hooks are read internally.
const LoopTableRow = React.memo(function LoopTableRow({
  row,
  index,
  tokenLogos,
}: {
  row: MultiplyPageData["lendRows"][number]
  index: number
  tokenLogos: MultiplyPageData["tokenLogos"]
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const { compact } = useCurrency()
  // Resolve case-insensitively: the Convex-hydrated tokenLogos keys can differ in case from
  // the catalog's mixed-case symbols (cbBTC/crvUSD/wstETH), so a strict lookup misses them —
  // fall back to the local resolver, which normalizes case.
  const assetLogo = resolveImageSrc(
    tokenLogos[row.asset as keyof typeof tokenLogos] ?? resolveMultiplyTokenLogo(row.asset),
  )
  const hasNegativeApy = isNegativeMultiplyApy(row.apy)

  return (
    <tr
      className="group asset-swap cursor-pointer transition-colors"
      onClick={() => router.push(row.href)}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <td
        className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
        {index + 1}
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
                className="size-12 shrink-0 object-contain"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : undefined}
              />
            </>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
              {row.protocolName ?? row.protocol}
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground">
              {row.protocol}
            </span>
          </span>
        </CellLink>
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <CellLink href={row.href} className="flex min-w-0 items-center gap-2.5">
          {assetLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetLogo}
                alt=""
                aria-hidden="true"
                className="size-12 shrink-0 object-contain"
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index < 2 ? "high" : undefined}
              />
            </>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
              {row.assetName ?? row.asset}
            </span>
            <span className="mt-0.5 block truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground">
              {row.asset}
            </span>
          </span>
        </CellLink>
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <CellLink
          href={row.href}
          className={cn(
            "font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums",
            row.apy ? "text-foreground dark:text-white" : "text-muted-foreground",
          )}
        >
          {row.apy || "—"}
        </CellLink>
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <CellLink
          href={row.href}
          className="block font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums text-foreground dark:text-white"
        >
          {row.rewardRows?.[0]?.value ?? row.partnerRewards ?? "—"}
        </CellLink>
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <CellLink href={row.href} className="block">
          <span className="block font-data text-[15px] font-normal tabular-nums text-foreground dark:text-white">
            {Math.round(row.collateralFactor * 100)}%
          </span>
          <span className="mt-0.5 block font-data text-[12px] tabular-nums text-muted-foreground">
            {t("LT")}: {Math.round(row.liquidationThreshold * 100)}%
          </span>
        </CellLink>
      </td>
      <td className={`py-3 px-4 pr-6 ${TABLE_ROW_HOVER_BG}`}>
        {row.waitlistHref ? (
          <div className="inline-flex items-center">
            <Button asChild size="sm" className="h-6 rounded-xs px-2.5 text-[11px]">
              <a href={row.waitlistHref} target="_blank" rel="noreferrer">
                {t("Join waitlist")}
              </a>
            </Button>
          </div>
        ) : (
          <CellLink href={row.href} className="block text-foreground">
            <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
              {row.availablePrimary ??
                (parseCompactUsdLabel(row.points) == null
                  ? (row.points ?? "—")
                  : compact(parseCompactUsdLabel(row.points) as number))}
            </span>
            {row.availableSecondary ? (
              <span className="mt-0.5 block text-[13px] tracking-[-0.03em] text-muted-foreground">
                {parseCompactUsdLabel(row.availableSecondary) == null
                  ? row.availableSecondary
                  : compact(parseCompactUsdLabel(row.availableSecondary) as number)}
              </span>
            ) : null}
          </CellLink>
        )}
      </td>
      <td className={`py-3 px-4 pr-4 ${TABLE_ROW_HOVER_RIGHT}`}>
        <div className="flex justify-end">
          <HoverActionGroup className="gap-2">
            <Button
              type="button"
              size="table"
              variant={hasNegativeApy ? "table-secondary" : "table-primary"}
              className="w-auto"
              onClick={(event) => {
                event.stopPropagation()
                const marketId = resolveMarketIdFromHref(row.href)
                if (!marketId) return
                router.push(actionPagePath("multiply", "multiply", { market: marketId, return: row.href }))
              }}
            >
              <ActionIcon label={hasNegativeApy ? "Review risk" : "Multiply"} />
              {t(hasNegativeApy ? "Review risk" : "Multiply")}
            </Button>
            <Button
              type="button"
              size="table"
              variant="table-secondary"
              className="w-auto"
              onClick={(event) => {
                event.stopPropagation()
                const marketId = resolveMarketIdFromHref(row.href)
                if (!marketId) return
                router.push(actionPagePath("multiply", "deleverage", { market: marketId, return: row.href }))
              }}
            >
              <ActionIcon label="Deleverage" />
              {t("Deleverage")}
            </Button>
          </HoverActionGroup>
        </div>
      </td>
    </tr>
  )
})

// Memoized mobile card — same rationale as LoopTableRow; props are stable references
// plus primitives so React.memo can skip cards whose data hasn't changed.
const MobileLoopCard = React.memo(function MobileLoopCard({
  row,
  index,
  protocolLogo,
  assetLogo,
  availableLabel,
}: {
  row: MultiplyPageData["lendRows"][number]
  index: number
  protocolLogo?: string | null
  assetLogo?: string | null
  availableLabel: string
}) {
  const { t } = useTranslation()
  return (
    <Link href={row.href}>
      <MarketMobileCard clickable>
        <MarketMobileCardHeader
          identity={
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-[72px] items-center">
                  {protocolLogo ? (
                    <div className="absolute left-0 top-0 z-10 flex size-12 items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={protocolLogo}
                        alt=""
                        aria-hidden="true"
                        className="size-full object-contain"
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index < 2 ? "high" : undefined}
                      />
                    </div>
                  ) : null}
                  {assetLogo ? (
                    <div className="absolute left-6 top-0 flex size-12 items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assetLogo}
                        alt=""
                        aria-hidden="true"
                        className="size-full object-contain"
                        loading={index < 2 ? "eager" : "lazy"}
                        fetchPriority={index < 2 ? "high" : undefined}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                    {row.protocol}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] tracking-[-0.03em] text-muted-foreground">
                    {row.asset}
                  </div>
                </div>
              </div>
            </div>
          }
          metric={
            <MarketMobileMetric
              value={row.apy || "—"}
              label={t("APY at {leverage}").replace("{leverage}", row.rewardRows?.[0]?.value ?? "max leverage")}
            />
          }
        />

        <MarketMobileStatList className="mt-4">
          <MarketMobileStatRow
            label={t("Max Leverage")}
            value={row.rewardRows?.[0]?.value ?? row.partnerRewards ?? "—"}
          />
          <MarketMobileStatRow label={t("Available")} value={availableLabel} />
        </MarketMobileStatList>
      </MarketMobileCard>
    </Link>
  )
})

function TrendingLoopCard({
  snapshot,
  interactive = true,
}: {
  snapshot: MultiplyPageData["trendingSnapshots"][number]
  interactive?: boolean
}) {
  const { t } = useTranslation()
  const collateralSrc = resolveImageSrc(snapshot.collateralLogo)
  const borrowSrc = resolveImageSrc(snapshot.borrowLogo, snapshot.collateralLogo)

  const cardClassName = cn(HIGHLIGHT_CARD_CLASS, "h-[104px] w-[min(372px,calc(100vw-2rem))] p-5")

  const content = (
    <>
      <div className="relative z-10 flex h-full items-center gap-3">
        {/* Overlapping collateral → borrow icon pair, sized to match the big
            single icon on the Lend "Featured" cards (64px). */}
        <div className="relative flex h-16 w-[96px] shrink-0 items-center">
          {collateralSrc ? (
            <span className="absolute left-0 top-1/2 z-10 flex size-16 -translate-y-1/2 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collateralSrc} alt="" aria-hidden="true" className="size-full object-contain" />
            </span>
          ) : null}
          {borrowSrc ? (
            <span className="absolute left-8 top-1/2 flex size-16 -translate-y-1/2 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={borrowSrc} alt="" aria-hidden="true" className="size-full object-contain" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">{snapshot.label}</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{t("Loop market")}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-data text-[15px] font-medium tracking-[-0.03em] text-success">{snapshot.apyLabel}</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{t("LOOP APY")}</div>
        </div>
      </div>
    </>
  )

  if (!interactive) {
    return (
      <div aria-hidden="true" className={cardClassName}>
        {content}
      </div>
    )
  }

  return (
    <Link href={snapshot.href} className={cardClassName}>
      {content}
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

function getResolvedLogo(value?: string | null) {
  return value ? resolveImageSrc(value) : null
}

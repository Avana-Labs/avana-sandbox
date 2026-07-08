"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DesktopTableSurface, HoverActionGroup, SilentActionHeader } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HIGHLIGHT_CARD_CLASS, HighlightCardBackdrop, HighlightCarousel } from "@/app/components/highlight-carousel"
import { hasImageSrc, resolveImageSrc } from "@/lib/image-src"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, type CategoryChip } from "@/app/lib/markets/category"
import { useTranslation } from "@/app/lib/i18n/use-translation"

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
}: ExploreLoopsMarketsTableProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { compact } = useCurrency()
  const [currentTab, setCurrentTab] = React.useState<MultiplyCategoryTabId>("all")
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [sortKey, setSortKey] = React.useState<"protocol" | "asset" | "apy" | "rewards" | "points">("protocol")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
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
    <section className="mt-7">
      <div>
        <div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.03em] text-foreground md:text-[24px]">{t("Trending")}</h2>
        </div>
      </div>

      <HighlightCarousel
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

      <DesktopTableSurface className="mt-[68px] rounded-radius-md">
        <div className="space-y-4 md:hidden">
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <MobileLoopCard
                key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                row={row}
                protocolLogo={getResolvedLogo(row.protocolLogo)}
                assetLogo={getResolvedLogo(getAssetLogo(row.asset))}
                availableLabel={
                  parseCompactUsdLabel(row.points) == null ? (row.points ?? "—") : compact(parseCompactUsdLabel(row.points) as number)
                }
              />
            ))
          ) : (
            <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground shadow-elev-1">
              {t("No loops in this category yet.")}
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
                        ? "text-foreground dark:text-white"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("COLLATERAL")}</span>
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
                        ? "text-foreground dark:text-white"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("BORROWABLE")}</span>
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
                        ? "text-foreground dark:text-white"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("MAX APY")}</span>
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
                        ? "text-foreground dark:text-white"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("MAX LEVERAGE")}</span>
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
                        ? "text-foreground dark:text-white"
                        : "text-foreground/70 dark:text-white/70",
                    )}
                  >
                    <span>{t("AVAILABLE")}</span>
                    <SortIcon />
                  </button>
                </th>
                <SilentActionHeader />
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
                    className="group asset-swap cursor-pointer transition-colors"
                    onClick={() => router.push(row.href)}
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
                          <span className="block truncate text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                            {row.protocol}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                            <span className="text-muted-foreground dark:text-white/38">{t("APY")}</span>
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
                          <span className="block text-[14px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                            {row.asset}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-normal tracking-[-0.03em]">
                            <span className="text-muted-foreground dark:text-white/38">{t("APY")}</span>
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
                            <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                              {row.rewardRows[1].value}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                              {row.rewardRows[1].label}
                            </span>
                          </span>
                        ) : row.rewardRows?.[0] ? (
                          <span className="block">
                            <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                              {row.rewardRows[0].value}
                            </span>
                            <span className="mt-0.5 block text-[12px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                              {row.rewardRows[0].label}
                            </span>
                          </span>
                        ) : row.partnerRewards ? (
                          <span className="block text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
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
                              {t("Join waitlist")}
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <CellLink
                          href={row.href}
                          className="inline-flex items-center text-[14px] font-normal tracking-[-0.03em] text-foreground dark:text-white"
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
                    <div className="flex justify-end">
                      <HoverActionGroup className="gap-2">
                        <Button
                          type="button"
                          size="table"
                          variant="brand-secondary"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            const marketId = resolveMarketIdFromHref(row.href)
                            if (!marketId) return
                            router.push(actionPagePath("multiply", "multiply", { market: marketId, return: row.href }))
                          }}
                        >
                          {t("Multiply")}
                        </Button>
                        <Button
                          type="button"
                          size="table"
                          variant="brand"
                          className="w-auto"
                          onClick={(event) => {
                            event.stopPropagation()
                            const marketId = resolveMarketIdFromHref(row.href)
                            if (!marketId) return
                            router.push(actionPagePath("multiply", "deleverage", { market: marketId, return: row.href }))
                          }}
                        >
                          {t("Deleverage")}
                        </Button>
                      </HoverActionGroup>
                    </div>
                  </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-[14px] text-muted-foreground dark:text-white/38"
                  >
                    {t("No loops in this category yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5">
          <span className="text-[12px] text-muted-foreground">
            {t("{page} of {count}").replace("{page}", String(page + 1)).replace("{count}", String(pageCount))}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Previous page")}
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Next page")}
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </DesktopTableSurface>
    </section>
  )
}

function MobileLoopCard({
  row,
  protocolLogo,
  assetLogo,
  availableLabel,
}: {
  row: MultiplyPageData["lendRows"][number]
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
                  <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">{row.protocol}</div>
                  <div className="mt-0.5 truncate text-[12px] tracking-[-0.03em] text-muted-foreground dark:text-white/40">{row.asset}</div>
                </div>
              </div>
            </div>
          }
          metric={
            <MarketMobileMetric
              value={row.apy || "—"}
              label={t("Max APY")}
              valueClassName={row.apy ? (row.apy.startsWith("-") ? "text-rose-600 dark:text-rose-400" : "text-success") : undefined}
            />
          }
        />

        <MarketMobileStatList className="mt-4">
          <MarketMobileStatRow label={t("Max Leverage")} value={row.rewardRows?.[1]?.value ?? row.rewardRows?.[0]?.value ?? row.partnerRewards ?? "—"} />
          <MarketMobileStatRow label={t("Liquidity")} value={availableLabel} />
        </MarketMobileStatList>
      </MarketMobileCard>
    </Link>
  )
}

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

  const cardClassName = cn(HIGHLIGHT_CARD_CLASS, "h-[104px] w-[372px] p-5")

  const content = (
    <>
      <HighlightCardBackdrop />

      <div className="relative z-10 flex h-full items-center gap-3">
        {/* Overlapping collateral → borrow icon pair, sized to match the big
            single icon on the Lend "Featured" cards. */}
        <div className="relative flex h-14 w-[84px] shrink-0 items-center">
          {collateralSrc ? (
            <span className="absolute left-0 top-1/2 z-10 flex size-14 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collateralSrc} alt="" aria-hidden="true" className="size-full object-cover" />
            </span>
          ) : null}
          {borrowSrc ? (
            <span className="absolute left-7 top-1/2 flex size-14 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={borrowSrc} alt="" aria-hidden="true" className="size-full object-cover" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">{snapshot.label}</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{t("Loop market")}</div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-data text-[15px] font-medium tracking-[-0.03em] text-success">{snapshot.apyLabel}</div>
          <div className="mt-1 text-[13px] text-muted-foreground dark:text-white/48">{t("APY")}</div>
        </div>

        <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[hsl(var(--brand-soft))] px-3 text-[13px] font-medium text-brand-readable dark:bg-[hsl(var(--brand-soft))]/20">
          {snapshot.maxLeverageLabel}
        </span>
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

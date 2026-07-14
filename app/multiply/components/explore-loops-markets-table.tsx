"use client"

import * as React from "react"
import { ActionIcon } from "@/app/components/action-icon"
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
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HIGHLIGHT_CARD_CLASS, HighlightCarousel } from "@/app/components/highlight-carousel"
import { hasImageSrc, resolveImageSrc } from "@/lib/image-src"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, categorizeMarket, type CategoryChip } from "@/app/lib/markets/category"
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

type LoopSortKey = "protocol" | "asset" | "apy" | "rewards" | "points"

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
  tokenBorrowApys,
  tokenLogos,
  tokenSupplyApys,
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

  // Bucket the filtered rows into the ordered collateral-family groups, dropping
  // any empty group — the same grouped-table treatment the Lend page uses. No
  // pagination: every market in a group is shown under its own sortable table.
  const groupedSections = React.useMemo(() => {
    const buckets: Record<LoopGroupKey, Array<MultiplyPageData["lendRows"][number]>> = {
      forex: [],
      eth: [],
      btc: [],
      other: [],
    }
    for (const row of filteredRows) buckets[loopGroupKey(row.protocol)].push(row)
    return LOOP_GROUP_ORDER.map((group) => ({ title: group.title, rows: buckets[group.key] })).filter(
      (group) => group.rows.length > 0,
    )
  }, [filteredRows])

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

      <div className="mt-[68px] space-y-14">
        {groupedSections.length > 0 ? (
          groupedSections.map((group) => (
            <div key={group.title} className="space-y-8">
              <LoopMarketsSection
                title={group.title}
                rows={group.rows}
                tokenLogos={tokenLogos}
                tokenSupplyApys={tokenSupplyApys}
                tokenBorrowApys={tokenBorrowApys}
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
    </section>
  )
}

function LoopMarketsSection({
  title,
  rows,
  tokenLogos,
  tokenSupplyApys,
  tokenBorrowApys,
}: {
  title: string
  rows: MultiplyPageData["lendRows"]
  tokenLogos: MultiplyPageData["tokenLogos"]
  tokenSupplyApys: MultiplyPageData["tokenSupplyApys"]
  tokenBorrowApys: MultiplyPageData["tokenBorrowApys"]
}) {
  const { t } = useTranslation()
  const { compact } = useCurrency()
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

      <DesktopTableSurface className="rounded-radius-md">
        <div className="space-y-4 md:hidden">
          {sortedRows.length ? (
            sortedRows.map((row, index) => (
              <MobileLoopCard
                key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                row={row}
                protocolLogo={getResolvedLogo(row.protocolLogo)}
                assetLogo={getResolvedLogo(tokenLogos[row.asset as keyof typeof tokenLogos])}
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
              <tbody key={`${title}-${sortKey}-${sortDirection}`} className="divide-y divide-border dark:divide-white/6">
                {sortedRows.map((row, index) => (
                  <LoopTableRow
                    key={`${row.kind}-${row.protocol}-${row.asset}-${row.href}-${index}`}
                    row={row}
                    index={index}
                    tokenLogos={tokenLogos}
                    tokenSupplyApys={tokenSupplyApys}
                    tokenBorrowApys={tokenBorrowApys}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DesktopTableSurface>
    </section>
  )
}

function LoopTableRow({
  row,
  index,
  tokenLogos,
  tokenSupplyApys,
  tokenBorrowApys,
}: {
  row: MultiplyPageData["lendRows"][number]
  index: number
  tokenLogos: MultiplyPageData["tokenLogos"]
  tokenSupplyApys: MultiplyPageData["tokenSupplyApys"]
  tokenBorrowApys: MultiplyPageData["tokenBorrowApys"]
}) {
  const router = useRouter()
  const { t } = useTranslation()
  const { compact } = useCurrency()
  const assetLogo = tokenLogos[row.asset as keyof typeof tokenLogos]
  const supplyApy = tokenSupplyApys[row.protocol as keyof typeof tokenSupplyApys]
  const borrowApy = tokenBorrowApys[row.asset as keyof typeof tokenBorrowApys]

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
                className="size-10 shrink-0 rounded-full bg-card object-cover"
              />
            </>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
              {row.protocol}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[13px] font-normal tracking-[-0.03em]">
              <span className="text-muted-foreground dark:text-white/38">{t("APY")}</span>
              <span className="font-data tabular-nums text-success">{supplyApy ?? "—"}</span>
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
                className="size-10 shrink-0 rounded-full bg-card object-cover"
              />
            </>
          ) : null}
          <span className="min-w-0">
            <span className="block text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
              {row.asset}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 truncate text-[13px] font-normal tracking-[-0.03em]">
              <span className="text-muted-foreground dark:text-white/38">{t("APY")}</span>
              <span className="font-data tabular-nums text-rose-600 dark:text-rose-400">{borrowApy ?? "—"}</span>
            </span>
          </span>
        </CellLink>
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <CellLink
          href={row.href}
          className={cn(
            "font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums",
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
              <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                {row.rewardRows[1].value}
              </span>
              <span className="mt-0.5 block text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                {row.rewardRows[1].label}
              </span>
            </span>
          ) : row.rewardRows?.[0] ? (
            <span className="block">
              <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                {row.rewardRows[0].value}
              </span>
              <span className="mt-0.5 block text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                {row.rewardRows[0].label}
              </span>
            </span>
          ) : row.partnerRewards ? (
            <span className="block text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
              {row.partnerRewards}
            </span>
          ) : (
            <span className="block text-[15px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
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
            className="inline-flex items-center text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white"
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
              variant="table-primary"
              className="w-auto"
              onClick={(event) => {
                event.stopPropagation()
                const marketId = resolveMarketIdFromHref(row.href)
                if (!marketId) return
                router.push(actionPagePath("multiply", "multiply", { market: marketId, return: row.href }))
              }}
            >
              <ActionIcon label="Multiply" />{t("Multiply")}
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
              <ActionIcon label="Deleverage" />{t("Deleverage")}
            </Button>
          </HoverActionGroup>
        </div>
      </td>
    </tr>
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
      <div className="relative z-10 flex h-full items-center gap-3">
        {/* Overlapping collateral → borrow icon pair, sized to match the big
            single icon on the Lend "Featured" cards (64px). */}
        <div className="relative flex h-16 w-[96px] shrink-0 items-center">
          {collateralSrc ? (
            <span className="absolute left-0 top-1/2 z-10 flex size-16 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={collateralSrc} alt="" aria-hidden="true" className="size-full object-cover" />
            </span>
          ) : null}
          {borrowSrc ? (
            <span className="absolute left-8 top-1/2 flex size-16 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
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

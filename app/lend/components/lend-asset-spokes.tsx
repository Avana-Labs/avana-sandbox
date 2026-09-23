"use client"

import Image from "next/image"
import { ActionIcon } from "@/app/components/action-icon"
import { CapacityFilled } from "@/app/components/capacity-filled"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { Button } from "@/components/ui/button"
import {
  DesktopTableSurface,
  HoverActionGroup,
  ScrollableTable,
  SortHeaderButton,
} from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileActionFooter,
  MarketMobileCardHeader,
  MarketMobileIdentityText,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileSecondaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
  MarketMobileSupportingValue,
} from "@/app/components/market-card-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"
import {
  TABLE_ACTION_BUTTON,
  TABLE_BODY_ROW,
  TABLE_CELL_INDEX,
  TABLE_CELL_NUMERIC,
  TABLE_CELL_PADDING,
  TABLE_CELL_PADDING_LEADING,
  TABLE_CELL_PADDING_TRAILING,
  TABLE_CELL_PRIMARY,
  TABLE_CELL_SECONDARY,
  TABLE_HEADER_CELL,
  TABLE_HEADER_ROW,
  TABLE_ROW_HOVER_BG,
  TABLE_ROW_HOVER_RIGHT,
  tableColumnLayout,
  tableStickyCell,
} from "@/app/lib/ui/table-row-hover"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, matchesCategory, type CategoryChip } from "@/app/lib/markets/category"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { RevealSentinel, useProgressiveReveal } from "@/app/lib/ui/use-progressive-reveal"
import { redenominateCompactUsd } from "@/app/lib/currency/format"
import { sizedLocalIconSrc } from "@/app/lib/local-asset-icons"

/** Real DefiLlama price under the asset name; falls back to the symbol when unpriced. */
function AssetSubLabel({ symbol }: { symbol: string }) {
  const priceFor = useCanonicalPriceFor()
  const price = priceFor(symbol)
  return <>{price !== undefined ? formatTokenPrice(price) : symbol}</>
}

type AssetRow = LendPageData["assetGroups"][number]["rows"][number] & {
  marketId?: string
  href?: string
  supplyApyLabel?: string
  rewardsApyLabel?: string
  totalApyLabel?: string
  supplyApyValue?: number
  rewardsApyValue?: number
  totalDepositsLabel?: string
  totalDepositsSecondaryLabel?: string
  totalDepositsSortValue?: number
  utilizationLabel?: string
  utilizationValue?: number
  availableLiquidityLabel?: string
  availableLiquiditySecondaryLabel?: string
  availableLiquiditySortValue?: number
}
type AssetGroup = LendPageData["assetGroups"][number]
const LEND_PAGE_SIZE = 12

/**
 * Sort each group's rows by the table's default order (asset name) BEFORE the progressive reveal
 * slices them. Slicing unsorted rows and letting the table sort them put newly revealed rows above
 * rows already on screen, so the list jumped as it grew.
 */
export function orderLendGroupsForReveal(groups: AssetGroup[]): AssetGroup[] {
  return groups.map((group) => ({ ...group, rows: [...group.rows].sort((a, b) => a.name.localeCompare(b.name)) }))
}

export function paginateLendAssetGroups(groups: AssetGroup[], page: number, pageSize = LEND_PAGE_SIZE) {
  const start = Math.max(0, page) * pageSize
  const end = start + pageSize
  let cursor = 0
  return groups
    .map((group) => {
      const groupStart = cursor
      const groupEnd = cursor + group.rows.length
      cursor = groupEnd
      const sliceStart = Math.max(0, start - groupStart)
      const sliceEnd = Math.min(group.rows.length, end - groupStart)
      return { ...group, rows: sliceEnd > sliceStart ? group.rows.slice(sliceStart, sliceEnd) : [] }
    })
    .filter((group) => group.rows.length > 0)
}
const DEFAULT_ASSET_GROUPS: AssetGroup[] = LEND_ASSET_GROUPS

function AssetIcon({ row, eager = false }: { row: AssetRow; eager?: boolean }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-12 shrink-0 items-center justify-center bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={sizedLocalIconSrc(row.logoSrc, 48)}
          width={48}
          height={48}
          sizes="48px"
          className="h-full w-full object-contain"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          unoptimized
        />
      </span>
    )
  }

  return <TokenIcon symbol={row.symbol} size="table" eager={eager} />
}

function AssetRowView({
  row,
  index,
  delay,
  onDeposit,
}: {
  row: AssetRow
  index: number
  delay: number
  onDeposit?: (marketId: string) => void
}) {
  const { t } = useTranslation()
  const { ctx } = useCurrency()
  const router = useRouter()
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  const detailHref = row.href ?? `/lend/markets/${marketId}`
  return (
    <tr
      className={`${TABLE_BODY_ROW} asset-swap group cursor-pointer transition-colors`}
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => router.push(detailHref)}
    >
      <td className={cn(TABLE_CELL_PADDING_LEADING, TABLE_CELL_INDEX, TABLE_ROW_HOVER_BG)}>{index + 1}</td>
      <td className={cn(TABLE_CELL_PADDING, tableStickyCell("body"))}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} eager={index < 2} />
          <div className="min-w-0">
            <div className={cn("truncate", TABLE_CELL_PRIMARY)}>{row.name}</div>
            <div className={cn("truncate", TABLE_CELL_SECONDARY)}>
              <AssetSubLabel symbol={row.symbol} />
            </div>
          </div>
        </div>
      </td>

      <td className={cn(TABLE_CELL_PADDING, TABLE_CELL_NUMERIC, TABLE_ROW_HOVER_BG)}>
        {row.supplyApyLabel ?? row.apy}
      </td>

      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <div className={TABLE_CELL_NUMERIC}>{row.totalDepositsLabel ?? row.totalDepositsPrimary}</div>
        <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>
          {redenominateCompactUsd(row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary, ctx)}
        </div>
      </td>

      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <CapacityFilled value={row.utilizationValue === undefined ? undefined : row.utilizationValue * 100} />
      </td>

      <td className={cn(TABLE_CELL_PADDING, TABLE_ROW_HOVER_BG)}>
        <div className={TABLE_CELL_NUMERIC}>{row.availableLiquidityLabel ?? row.availableLiquidityPrimary}</div>
        <div className={cn(TABLE_CELL_SECONDARY, "tabular-nums")}>
          {redenominateCompactUsd(row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary, ctx)}
        </div>
      </td>

      <td
        className={cn(TABLE_CELL_PADDING_TRAILING, "text-right", TABLE_ROW_HOVER_RIGHT)}
        onClick={(event) => event.stopPropagation()}
      >
        {onDeposit ? (
          <HoverActionGroup className="gap-2">
            <Button
              type="button"
              size="table"
              variant="table-primary"
              className={TABLE_ACTION_BUTTON}
              onClick={(e) => {
                e.stopPropagation()
                onDeposit(marketId)
              }}
            >
              <ActionIcon label="Deposit" />
              {t("Deposit")}
            </Button>
          </HoverActionGroup>
        ) : null}
      </td>
    </tr>
  )
}

function AssetCardView({
  row,
  index,
  onDeposit,
  canWithdraw,
}: {
  row: AssetRow
  index: number
  onDeposit?: (marketId: string) => void
  canWithdraw: boolean
}) {
  const { t } = useTranslation()
  const { ctx } = useCurrency()
  const router = useRouter()
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  const detailHref = row.href ?? `/lend/markets/${marketId}`
  const detailReturn = detailHref
  return (
    <MarketMobileCard clickable style={{ animationDelay: `${index * 40}ms` }} onClick={() => router.push(detailHref)}>
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-3">
            <AssetIcon row={row} eager={index < 2} />
            <MarketMobileIdentityText title={row.name} subtitle={<AssetSubLabel symbol={row.symbol} />} />
          </div>
        }
        metric={<MarketMobileMetric value={row.supplyApyLabel ?? row.apy} label={t("APY")} />}
      />
      <MarketMobileStatList>
        <MarketMobileStatRow
          label={t("Total Deposits")}
          value={
            <span>
              {row.totalDepositsLabel ?? row.totalDepositsPrimary}
              <MarketMobileSupportingValue>
                {redenominateCompactUsd(row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary, ctx)}
              </MarketMobileSupportingValue>
            </span>
          }
        />
        <MarketMobileStatRow
          label={t("Capacity Filled")}
          value={<CapacityFilled value={row.utilizationValue === undefined ? undefined : row.utilizationValue * 100} />}
        />
        <MarketMobileStatRow
          label={t("Available")}
          value={
            <span>
              {row.availableLiquidityLabel ?? row.availableLiquidityPrimary}
              <MarketMobileSupportingValue>
                {redenominateCompactUsd(row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary, ctx)}
              </MarketMobileSupportingValue>
            </span>
          }
        />
      </MarketMobileStatList>
      {onDeposit ? (
        <MarketMobileActionFooter>
          <MarketMobilePrimaryAction
            className="mt-0 flex-1"
            onClick={(event) => {
              event.stopPropagation()
              onDeposit(marketId)
            }}
          >
            <ActionIcon label="Deposit" />
            {t("Deposit")}
          </MarketMobilePrimaryAction>
          <MarketMobileSecondaryAction
            disabled={!canWithdraw}
            title={canWithdraw ? undefined : t("No supplied position to withdraw")}
            onClick={(event) => {
              event.stopPropagation()
              if (!canWithdraw) return
              router.push(
                actionPagePath("lend", "withdraw", {
                  market: marketId,
                  return: detailReturn,
                }),
              )
            }}
          >
            <ActionIcon label="Withdraw" />
            {t("Withdraw")}
          </MarketMobileSecondaryAction>
        </MarketMobileActionFooter>
      ) : null}
    </MarketMobileCard>
  )
}

const LEND_TABLE_LAYOUT = tableColumnLayout([
  "index",
  "identity",
  "compact", // APY
  "metric", // Total deposits
  "gauge", // Capacity filled
  "metric", // Available
  "action",
])

function AssetSection({
  title,
  subtitle,
  rows,
  onDeposit,
  withdrawableMarketIds,
  initialIsDesktop,
  deferContent,
}: {
  title: string
  subtitle?: string
  rows: AssetRow[]
  onDeposit?: (marketId: string) => void
  withdrawableMarketIds: ReadonlySet<string>
  initialIsDesktop: boolean
  deferContent: boolean
}) {
  const { t } = useTranslation()
  const isDesktop = useMediaQuery("(min-width: 768px)", initialIsDesktop, true)
  const sectionRef = useRef<HTMLElement | null>(null)
  const [contentMounted, setContentMounted] = useState(!deferContent || process.env.NODE_ENV === "test")
  const [sortKey, setSortKey] = useState<
    "asset" | "supplyApy" | "totalDeposits" | "utilization" | "availableLiquidity"
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
        case "totalDeposits":
          return (
            ((a.totalDepositsSortValue ?? a.totalDepositsValue ?? 0) -
              (b.totalDepositsSortValue ?? b.totalDepositsValue ?? 0)) *
            direction
          )
        case "utilization":
          return ((a.utilizationValue ?? 0) - (b.utilizationValue ?? 0)) * direction
        case "availableLiquidity":
          return (
            ((a.availableLiquiditySortValue ?? a.availableLiquidityValue ?? 0) -
              (b.availableLiquiditySortValue ?? b.availableLiquidityValue ?? 0)) *
            direction
          )
        case "asset":
        default:
          return a.name.localeCompare(b.name) * direction
      }
    })
  }, [rows, sortDirection, sortKey])

  const sortHeader = (key: typeof sortKey, label: string) => (
    <SortHeaderButton label={label} active={sortKey === key} onClick={() => toggleSort(key)} />
  )

  useEffect(() => {
    if (contentMounted) return
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === "undefined") {
      setContentMounted(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setContentMounted(true)
        observer.disconnect()
      },
      { rootMargin: "400px 0px", threshold: 0 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [contentMounted])

  return (
    <section ref={sectionRef} className="space-y-5">
      {/* Sticky like the Borrow spoke headers: each asset-group title hangs under the
          site header while its own table scrolls, then the next group's title takes over. */}
      <div className="sticky top-16 z-20 flex flex-col gap-3 bg-background py-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2
            className={cn(
              "text-[22px] font-normal tracking-[-0.01em] text-foreground dark:text-white md:text-[24px]",
              title === "Ethereum-Based" ? "md:text-[23px]" : "",
            )}
          >
            {t(title)}
          </h2>
          {subtitle ? <p className="mt-1 text-[13px] text-muted-foreground dark:text-white/44">{t(subtitle)}</p> : null}
        </div>
      </div>

      {!contentMounted ? (
        <div aria-hidden className="min-h-[640px] rounded-radius-md bg-table-row" />
      ) : (
        <DesktopTableSurface className="!rounded-none [contain-intrinsic-size:auto_640px] [content-visibility:auto]">
          {!isDesktop ? (
            <div className="space-y-3">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => (
                  <AssetCardView
                    key={row.symbol}
                    row={row}
                    index={index}
                    onDeposit={onDeposit}
                    canWithdraw={withdrawableMarketIds.has(
                      "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase(),
                    )}
                  />
                ))
              ) : (
                <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {t("No assets match these filters.")}
                </div>
              )}
            </div>
          ) : null}
          {isDesktop ? (
            <ScrollableTable layout={LEND_TABLE_LAYOUT}>
              <thead>
                <tr className={TABLE_HEADER_ROW}>
                  <th className={cn(TABLE_HEADER_CELL, "pl-6 pr-3")}>#</th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4", tableStickyCell("header"))}>
                    {sortHeader("asset", t("Asset"))}
                  </th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("supplyApy", t("APY"))}</th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("totalDeposits", t("Total Deposits"))}</th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("utilization", t("Capacity Filled"))}</th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4")}>{sortHeader("availableLiquidity", t("Available"))}</th>
                  <th className={cn(TABLE_HEADER_CELL, "px-4 pr-5 text-right")}>
                    {/* Names the action column for screen readers (an empty <th> isn't a header). */}
                    <span className="sr-only">{t("Quick actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody
                key={`${title}-${sortKey}-${sortDirection}`}
                className="divide-y divide-border dark:divide-white/6"
              >
                {sortedRows.length > 0 ? (
                  sortedRows.map((row, index) => (
                    <AssetRowView key={row.symbol} row={row} index={index} delay={index * 40} onDeposit={onDeposit} />
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60"
                      colSpan={LEND_TABLE_LAYOUT.widths.length}
                    >
                      {t("No assets match these filters.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </ScrollableTable>
          ) : null}
        </DesktopTableSurface>
      )}
    </section>
  )
}

export function LendAssetSpokes({
  groups = DEFAULT_ASSET_GROUPS,
  onDeposit,
  withdrawableMarketIds = new Set<string>(),
  initialIsDesktop = true,
}: {
  groups?: LendPageData["assetGroups"]
  onDeposit?: (marketId: string) => void
  withdrawableMarketIds?: ReadonlySet<string>
  initialIsDesktop?: boolean
}) {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  // Deep links (e.g. the header mega-menu's "View all") can preselect a category via ?category=.
  const [currentTab, setCurrentTab] = useState<CategoryChip["id"]>(() => {
    const param = searchParams?.get("category")
    return param && CATEGORY_CHIPS.lend.some((chip) => chip.id === param) ? (param as CategoryChip["id"]) : "all"
  })

  // Deep links from the header mega-menu ("View all") keep the chip in sync when the query
  // changes on this same page; the #markets hash on the link handles scrolling here.
  const categoryParam = searchParams?.get("category")
  useEffect(() => {
    if (categoryParam && CATEGORY_CHIPS.lend.some((chip) => chip.id === categoryParam)) {
      setCurrentTab(categoryParam as CategoryChip["id"])
    }
  }, [categoryParam])

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    const filtered = groups
      .map((group) => {
        const rows = group.rows.filter((row) => {
          const matchesSearch =
            query.length === 0 || row.name.toLowerCase().includes(query) || row.symbol.toLowerCase().includes(query)
          return matchesSearch && matchesCategory(row.symbol, currentTab)
        })

        return { ...group, rows }
      })
      .filter((group) => group.rows.length > 0)
    return orderLendGroupsForReveal(filtered)
  }, [groups, search, currentTab])
  const totalRows = filteredGroups.reduce((sum, group) => sum + group.rows.length, 0)

  // Reveal assets on scroll instead of paginating: only the first chunk of rows
  // (sliced across the ordered groups) renders up front, then the sentinel eases
  // in the rest as the user scrolls down.
  const { visibleCount, hasMore, isRevealing, sentinelRef } = useProgressiveReveal({
    total: totalRows,
    chunkSize: LEND_PAGE_SIZE,
    resetKey: `${currentTab}|${search.trim().toLowerCase()}`,
  })
  const revealedGroups = useMemo(
    () => paginateLendAssetGroups(filteredGroups, 0, visibleCount),
    [filteredGroups, visibleCount],
  )

  return (
    <section
      id="markets"
      className="mt-6 scroll-mt-24 space-y-8 sm:mt-[38px] sm:space-y-[58px]"
      style={{ overflowAnchor: "none" }}
    >
      <div className="py-2.5">
        <MarketFilterBar
          chips={CATEGORY_CHIPS.lend}
          tab={currentTab}
          onTabChange={setCurrentTab}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("Search assets")}
        />
      </div>

      <div className="space-y-14">
        {revealedGroups.length > 0 ? (
          revealedGroups.map((group, index) => (
            <div key={group.title} className="space-y-8">
              <AssetSection
                title={group.title}
                subtitle={group.subtitle}
                rows={group.rows}
                onDeposit={onDeposit}
                withdrawableMarketIds={withdrawableMarketIds}
                initialIsDesktop={initialIsDesktop}
                deferContent={index > 0}
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
            {t("No assets match these filters.")}
          </div>
        )}
      </div>

      {hasMore ? <RevealSentinel sentinelRef={sentinelRef} active={isRevealing} /> : null}
    </section>
  )
}

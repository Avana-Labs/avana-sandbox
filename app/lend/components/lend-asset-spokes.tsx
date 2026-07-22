"use client"

import Image from "next/image"
import { ActionIcon } from "@/app/components/action-icon"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { Button } from "@/components/ui/button"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend"
import type { LendPageData } from "@/app/lib/data/providers/lend"
import { cn } from "@/lib/utils"
import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { MarketFilterBar } from "@/app/lib/ui/market-filter-bar"
import { CATEGORY_CHIPS, matchesCategory, type CategoryChip } from "@/app/lib/markets/category"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { RevealSentinel, useProgressiveReveal } from "@/app/lib/ui/use-progressive-reveal"
import { redenominateCompactUsd } from "@/app/lib/currency/format"

/** Real DefiLlama price under the asset name; falls back to the symbol when unpriced. */
function AssetSubLabel({ symbol }: { symbol: string }) {
  const priceFor = usePriceFor()
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

function AssetIcon({ row, eager = false }: { row: AssetRow; eager?: boolean }) {
  if (row.logoSrc) {
    return (
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-transparent">
        <Image
          alt={row.logoAlt ?? `${row.symbol} logo`}
          src={row.logoSrc}
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

  return <TokenIcon symbol={row.symbol} size="table" ring className="bg-card dark:bg-card" eager={eager} />
}

function AssetRowView({
  row,
  index,
  delay,
  onDeposit,
  canWithdraw,
}: {
  row: AssetRow
  index: number
  delay: number
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
    <tr
      className="asset-swap group cursor-pointer transition-colors"
      style={{ animationDelay: `${delay}ms` }}
      onClick={() => router.push(detailHref)}
    >
      <td
        className={`py-3 pl-6 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
      >
        {index + 1}
      </td>
      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="flex min-w-0 items-center gap-3">
          <AssetIcon row={row} eager={index < 2} />
          <div className="min-w-0">
            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
              {row.name}
            </div>
            <div className="mt-0.5 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground md:text-[13px]">
              <AssetSubLabel symbol={row.symbol} />
            </div>
          </div>
        </div>
      </td>

      <td
        className={`py-3 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px] ${TABLE_ROW_HOVER_BG}`}
      >
        <span className="tabular-nums">{row.supplyApyLabel ?? row.apy}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">{row.totalDepositsLabel ?? row.totalDepositsPrimary}</span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          {redenominateCompactUsd(row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary, ctx)}
        </div>
      </td>

      <td
        className={`py-3 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px] ${TABLE_ROW_HOVER_BG}`}
      >
        <span className="tabular-nums">{row.utilizationLabel ?? "—"}</span>
      </td>

      <td className={`py-3 px-4 ${TABLE_ROW_HOVER_BG}`}>
        <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white md:text-[15px]">
          <span className="tabular-nums">{row.availableLiquidityLabel ?? row.availableLiquidityPrimary}</span>
        </div>
        <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
          {redenominateCompactUsd(row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary, ctx)}
        </div>
      </td>

      <td className={`py-3 px-4 pr-4 ${TABLE_ROW_HOVER_RIGHT}`}>
        {onDeposit ? (
          <div className="flex justify-end">
            <HoverActionGroup className="gap-2">
              <Button
                type="button"
                size="table"
                variant="table-primary"
                className="w-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeposit(marketId)
                }}
              >
                <ActionIcon label="Deposit" />
                {t("Deposit")}
              </Button>
              <Button
                type="button"
                size="table"
                variant="table-secondary"
                className="w-auto"
                disabled={!canWithdraw}
                title={canWithdraw ? undefined : t("No supplied position to withdraw")}
                onClick={(e) => {
                  e.stopPropagation()
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
              </Button>
            </HoverActionGroup>
          </div>
        ) : null}
      </td>
    </tr>
  )
}

function AssetCardView({ row, index }: { row: AssetRow; index: number }) {
  const { t } = useTranslation()
  const { ctx } = useCurrency()
  const router = useRouter()
  const marketId = "marketId" in row && typeof row.marketId === "string" ? row.marketId : row.symbol.toLowerCase()
  const detailHref = row.href ?? `/lend/markets/${marketId}`
  return (
    <MarketMobileCard clickable style={{ animationDelay: `${index * 40}ms` }} onClick={() => router.push(detailHref)}>
      <MarketMobileCardHeader
        identity={
          <div className="flex min-w-0 items-center gap-3">
            <AssetIcon row={row} eager={index < 2} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                {row.name}
              </div>
              <div className="mt-0.5 text-[12px] tracking-[-0.03em] text-muted-foreground">
                <AssetSubLabel symbol={row.symbol} />
              </div>
            </div>
          </div>
        }
        metric={<MarketMobileMetric value={row.supplyApyLabel ?? row.apy} label={t("APY")} />}
      />
      <MarketMobileStatList className="mt-4">
        <MarketMobileStatRow
          label={t("Total Deposits")}
          value={
            <span>
              {row.totalDepositsLabel ?? row.totalDepositsPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                {redenominateCompactUsd(row.totalDepositsSecondaryLabel ?? row.totalDepositsSecondary, ctx)}
              </span>
            </span>
          }
        />
        <MarketMobileStatRow label={t("Utilization")} value={row.utilizationLabel ?? "—"} />
        <MarketMobileStatRow
          label={t("Available")}
          value={
            <span>
              {row.availableLiquidityLabel ?? row.availableLiquidityPrimary}
              <span className="ml-2 text-[12px] tracking-[-0.03em] text-muted-foreground">
                {redenominateCompactUsd(row.availableLiquiditySecondaryLabel ?? row.availableLiquiditySecondary, ctx)}
              </span>
            </span>
          }
        />
      </MarketMobileStatList>
    </MarketMobileCard>
  )
}

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
              "text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]",
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
            <div className="space-y-4">
              {sortedRows.length > 0 ? (
                sortedRows.map((row, index) => <AssetCardView key={row.symbol} row={row} index={index} />)
              ) : (
                <div className="rounded-radius-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
                  {t("No assets match these filters.")}
                </div>
              )}
            </div>
          ) : null}
          {isDesktop ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] table-fixed border-separate border-spacing-0 text-[12px]">
                <colgroup>
                  <col className="w-[4%]" />
                  <col className="w-[18%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[11%]" />
                  <col className="w-[18%]" />
                  <col className="w-[24%]" />
                </colgroup>
                <thead>
                  <tr className="bg-table-header text-left text-muted-foreground">
                    <th className="bg-table-header pb-3 pl-6 pr-3 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      #
                    </th>
                    <th className="bg-table-header px-4 pb-3 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("asset")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "asset"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("ASSET")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-3 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("supplyApy")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "supplyApy"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("SUPPLY APY")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-3 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("totalDeposits")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "totalDeposits"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("TOTAL DEPOSITS")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-3 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("utilization")}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          sortKey === "utilization"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("UTILIZATION")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-3 pr-6 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                      <button
                        type="button"
                        onClick={() => toggleSort("availableLiquidity")}
                        className={cn(
                          "flex w-full items-center gap-2 transition-colors",
                          sortKey === "availableLiquidity"
                            ? "text-foreground dark:text-white"
                            : "text-muted-foreground/70 dark:text-white/42",
                        )}
                      >
                        <span>{t("AVAILABLE")}</span>
                        <SortIcon />
                      </button>
                    </th>
                    <th className="bg-table-header px-4 pb-3 pr-5 pt-4 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
                  </tr>
                </thead>
                <tbody
                  key={`${title}-${sortKey}-${sortDirection}`}
                  className="divide-y divide-border dark:divide-white/6"
                >
                  {sortedRows.length > 0 ? (
                    sortedRows.map((row, index) => (
                      <AssetRowView
                        key={row.symbol}
                        row={row}
                        index={index}
                        delay={index * 40}
                        onDeposit={onDeposit}
                        canWithdraw={withdrawableMarketIds.has(row.marketId ?? row.symbol.toLowerCase())}
                      />
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-10 text-[12px] text-muted-foreground dark:text-white/60" colSpan={7}>
                        {t("No assets match these filters.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  const [search, setSearch] = useState("")
  const [currentTab, setCurrentTab] = useState<CategoryChip["id"]>("all")

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase()

    return groups
      .map((group) => {
        const rows = group.rows.filter((row) => {
          const matchesSearch =
            query.length === 0 || row.name.toLowerCase().includes(query) || row.symbol.toLowerCase().includes(query)
          return matchesSearch && matchesCategory(row.symbol, currentTab)
        })

        return { ...group, rows }
      })
      .filter((group) => group.rows.length > 0)
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
    <section className="mt-[38px] space-y-[58px]" style={{ overflowAnchor: "none" }}>
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

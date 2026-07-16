"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { ActionIcon } from "@/app/components/action-icon"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import {
  aprToneClass,
  formatRiskPremium,
  getSpokeById,
  type BorrowPoolEvent,
  type BorrowPoolRow,
  type BorrowSpoke,
  type BorrowableAsset,
  type DexGroup,
  type PendingMarketRow,
} from "@/app/lib/data/borrow-domain"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { BorrowableAssetsPanel } from "./borrowable-assets-table"
import { DexChipRow, PillButton, TokenBubble, TokenPairCell, TrendSpark } from "./atoms"
import { usePriceFor } from "@/app/lib/prices/token-prices-context"
import { pairExchangeRateLabel } from "@/app/lib/prices/format"
import { formatApy } from "@/app/lib/format"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

function EventTagList({ events }: { events?: BorrowPoolEvent[] }) {
  if (!events || events.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap justify-end gap-1">
      {events.map((event, index) => {
        const tone = event.tone ?? "info"
        const toneClass =
          tone === "positive"
            ? "bg-emerald-500/10 text-success"
            : tone === "warning"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : tone === "danger"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                : "bg-surface-inset text-muted-foreground"
        return (
          <span
            key={`${event.label}-${index}`}
            className={cn("inline-flex items-center rounded-xs px-1.5 py-0.5 text-[10px] font-medium", toneClass)}
          >
            {event.label}
          </span>
        )
      })}
    </div>
  )
}

type CollateralPoolsTableProps = {
  groups: ReadonlyArray<DexGroup>
  borrowAssetsBySpoke: Readonly<Record<string, BorrowableAsset[]>>
  pending?: ReadonlyArray<PendingMarketRow>
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAssetDesktop: (asset: BorrowableAsset) => void
  onBorrowAssetMobile: (asset: BorrowableAsset) => void
}

type SectionTabId = "collateral" | "borrow"
const INITIAL_MOBILE_COLLATERAL_ROWS = 4

function SectionTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: SectionTabId
  onTabChange: (tab: SectionTabId) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-8 border-b border-border/50 md:border-b-0">
      {[
        // UI labels only. The tab `id`s are the backend/routing terms and MUST stay
        // "collateral" / "borrow": the "collateral" tab lists the LP *markets* (see
        // CollateralDesktopTable) and the "borrow" tab lists the *borrowable* assets
        // (see BorrowableAssetsPanel / borrowAssetsBySpoke). If you're looking for the
        // "Borrowable" assets, that's the `id: "borrow"` tab below.
        { id: "collateral", label: t("Collateral") },
        { id: "borrow", label: t("Borrowable") },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id as SectionTabId)}
          className={[
            "border-b-2 pb-2 text-left text-[15px] font-normal tracking-[-0.03em] transition-colors md:text-[17px]",
            activeTab === tab.id
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
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

function CollateralAssetCell({ pool }: { pool: BorrowPoolRow }) {
  const priceFor = usePriceFor()
  const { compact } = useCurrency()
  const { t } = useTranslation()
  // Pair exchange rate (e.g. "1 ETH = 1,612 USDC") from the real price oracle;
  // falls back to TVL when either token is unpriced / the oracle is unavailable.
  const subtitle =
    pairExchangeRateLabel(pool.visuals[0].symbol, pool.visuals[1].symbol, priceFor) ??
    `${compact(pool.tvlUsd)} ${t("TVL")}`
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex items-center">
        <span className="relative z-[1]">
          <TokenBubble visual={pool.visuals[0]} size="table" ring={false} className="bg-transparent" />
        </span>
        <span className="-ml-3">
          <TokenBubble visual={pool.visuals[1]} size="table" ring={false} className="bg-transparent" />
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
          {pool.visuals[0].symbol} / {pool.visuals[1].symbol}
        </div>
        <div className="mt-1 truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
          {subtitle}
        </div>
      </div>
    </div>
  )
}

// Borrow pools store a single risk ratio (max LTV, which is the collateral
// factor). Real lending markets sit the liquidation threshold a few points above
// the collateral factor, so derive a display LT that way — this lets the CF column
// read like the multiply table's (CF on top, small "LT:" below).
function poolLiquidationThresholdPct(pool: BorrowPoolRow) {
  return Math.min(97, Math.round(pool.ltv) + 5)
}

function CollateralDesktopTable({
  rows,
  pending,
  onViewMarket,
  onUseAsCollateral,
  embedded = false,
}: {
  rows: ReadonlyArray<BorrowPoolRow>
  pending: ReadonlyArray<PendingMarketRow>
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral?: (pool: BorrowPoolRow) => void
  embedded?: boolean
}) {
  const router = useRouter()
  const { compact, ctx, convert } = useCurrency()
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<"asset" | "apy" | "deposits" | "cf" | "risk" | "supplied">("asset")
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
        case "apy":
          return ((a.aprMin + a.aprMax) / 2 - (b.aprMin + b.aprMax) / 2) * direction
        case "cf":
          return (a.ltv - b.ltv) * direction
        case "deposits":
          return (a.tvlUsd - b.tvlUsd) * direction
        case "risk":
          return (a.riskPremiumBps - b.riskPremiumBps) * direction
        case "supplied":
          return (a.availableUsd - b.availableUsd) * direction
        case "asset":
        default:
          return (
            `${a.visuals[0].symbol}/${a.visuals[1].symbol}`.localeCompare(
              `${b.visuals[0].symbol}/${b.visuals[1].symbol}`,
            ) * direction
          )
      }
    })
  }, [rows, sortDirection, sortKey])

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-[12px]">
        <thead>
          <tr className="bg-table-header text-left text-muted-foreground">
            <th className="pb-3 pt-4 pl-6 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              #
            </th>
            <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
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
            <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("apy")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "apy" ? "text-foreground dark:text-white" : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("TRADING FEES")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("deposits")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "deposits"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("TOTAL DEPOSITS")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("cf")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "cf" ? "text-foreground dark:text-white" : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("CF")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("risk")}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  sortKey === "risk"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("RISK PREMIUM")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-3 pt-4 px-4 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
              <button
                type="button"
                onClick={() => toggleSort("supplied")}
                className={cn(
                  "flex w-full items-center gap-2 transition-colors",
                  sortKey === "supplied"
                    ? "text-foreground dark:text-white"
                    : "text-muted-foreground/70 dark:text-white/42",
                )}
              >
                <span>{t("AVAILABLE")}</span>
                <SortIcon />
              </button>
            </th>
            <th className="pb-3 pt-4 px-4 pr-5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
          </tr>
        </thead>
        <tbody key={`collateral-${sortKey}-${sortDirection}-${sortedRows.length}`}>
          {sortedRows.map((pool, index) => (
            <tr
              key={pool.id}
              className="asset-swap group cursor-pointer transition-colors"
              onClick={() => onViewMarket(pool)}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <td
                className={`py-2.5 pl-6 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}
              >
                {index + 1}
              </td>
              <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                <CollateralAssetCell pool={pool} />
              </td>
              <td
                className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
              >
                <span className="tabular-nums">{formatApy((pool.aprMin + pool.aprMax) / 2)}</span>
              </td>
              <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                  <span className="tabular-nums">{compact(pool.tvlUsd)}</span>
                </div>
                <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
                  <span className="tabular-nums">{`${ctx.symbol}${Math.round(convert(pool.tvlUsd)).toLocaleString("en-US")}`}</span>
                </div>
              </td>
              <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                <div className="font-data text-[15px] font-normal tracking-[-0.03em] tabular-nums text-foreground dark:text-white">
                  {Math.round(pool.ltv)}%
                </div>
                <div className="mt-0.5 font-data text-[12px] tabular-nums text-muted-foreground">
                  {t("LT")}: {poolLiquidationThresholdPct(pool)}%
                </div>
              </td>
              <td
                className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white ${TABLE_ROW_HOVER_BG}`}
              >
                <span className="tabular-nums">{formatRiskPremium(pool.riskPremiumBps)}</span>
              </td>
              <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white">
                  <span className="tabular-nums">{compact(pool.availableUsd)}</span>
                </div>
                <div className="mt-0.5 text-[13px] tracking-[-0.03em] text-muted-foreground">
                  <span className="tabular-nums">{`${ctx.symbol}${Math.round(convert(pool.availableUsd)).toLocaleString("en-US")}`}</span>
                </div>
              </td>
              <td className={`py-2.5 px-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                <HoverActionGroup className="gap-2">
                  {onUseAsCollateral ? (
                    <Button
                      type="button"
                      size="table"
                      variant="table-primary"
                      className="w-auto"
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      <ActionIcon label="Pledge" />
                      {t("Pledge")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="table"
                    variant="table-secondary"
                    className="w-auto"
                    onClick={(event) => {
                      event.stopPropagation()
                      router.push(
                        actionPagePath("borrow", "borrow", {
                          market: pool.id,
                          return: `/borrow/markets/${pool.id}`,
                        }),
                      )
                    }}
                  >
                    <ActionIcon label="Borrow" />
                    {t("Borrow")}
                  </Button>
                </HoverActionGroup>
              </td>
            </tr>
          ))}
          {pending.map((row) => (
            <tr key={row.id}>
              <td className="px-6 py-2.5 text-[12px] text-muted-foreground" colSpan={8}>
                {row.label}
                <span className="ml-2 text-[12px] text-muted-foreground">· {row.subLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (embedded) {
    return table
  }

  return <DesktopTableSurface>{table}</DesktopTableSurface>
}

export const CollateralPoolsTable = memo(function CollateralPoolsTable({
  groups,
  borrowAssetsBySpoke,
  pending = [],
  onViewMarket,
  onUseAsCollateral,
  onBorrowAssetDesktop,
}: CollateralPoolsTableProps) {
  const spokes = groups.flatMap((group) => group.spokes)

  return (
    <div className="hidden space-y-10 md:block">
      {spokes.map((entry, index) => (
        <SpokeDesktopSection
          key={entry.spoke.id}
          spoke={entry.spoke}
          rows={entry.rows}
          borrowAssets={borrowAssetsBySpoke[entry.spoke.id] ?? []}
          pending={pending.filter((row) => row.spoke === entry.spoke.id)}
          onViewMarket={onViewMarket}
          onUseAsCollateral={onUseAsCollateral}
          onBorrowAsset={onBorrowAssetDesktop}
          deferContent={index > 0}
        />
      ))}
    </div>
  )
})

function SpokeDesktopSection({
  spoke,
  rows,
  borrowAssets,
  pending,
  onViewMarket,
  onUseAsCollateral,
  onBorrowAsset,
  deferContent,
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  borrowAssets: BorrowableAsset[]
  pending: PendingMarketRow[]
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
  deferContent: boolean
}) {
  // Each spoke/category owns its own Collateral/Borrowable toggle.
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  const [contentMounted, setContentMounted] = useState(!deferContent)
  const sectionRef = useRef<HTMLElement | null>(null)

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
  // NOTE: no `overflow-hidden` / `cv-section` here — both would trap the sticky
  // section header. The header below is `sticky top-16` so each spoke title (+ its
  // Collateral/Borrowable tabs) hangs under the site header while its own table
  // scrolls, then the next spoke's header takes over.
  return (
    <section ref={sectionRef} className="mb-2">
      <div className="mt-4 rounded-radius-xl bg-transparent md:shadow-none">
        <div className="sticky top-16 z-20 flex items-center justify-between gap-3 rounded-t-radius-xl bg-background py-2 md:py-3">
          <SectionTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              setContentMounted(true)
              setActiveTab(tab)
            }}
          />
          <h3 className="text-[22px] font-medium tracking-[-0.03em] text-foreground dark:text-white md:text-[24px]">
            {spoke.label}
          </h3>
        </div>
        <div className="bg-transparent">
          {!contentMounted ? (
            <div
              aria-hidden
              className="min-h-[360px] rounded-radius-md bg-table-row"
              data-testid="deferred-spoke-content"
            />
          ) : activeTab === "collateral" ? (
            <CollateralDesktopTable
              rows={rows}
              pending={pending}
              onViewMarket={onViewMarket}
              onUseAsCollateral={onUseAsCollateral}
              embedded
            />
          ) : (
            <BorrowableAssetsPanel
              rows={borrowAssets}
              onBorrow={onBorrowAsset}
              groupByCategory={false}
              variant="loan"
            />
          )}
        </div>
      </div>
    </section>
  )
}

export function CollateralPoolsList({
  groups,
  borrowAssetsBySpoke,
  pending = [],
  onViewMarket,
  onUseAsCollateral,
  onBorrowAssetMobile,
}: CollateralPoolsTableProps) {
  return (
    <div className="space-y-8 md:hidden">
      {groups
        .flatMap((group) => group.spokes)
        .map((entry, index) => (
          <SpokeMobileSection
            key={entry.spoke.id}
            spoke={entry.spoke}
            rows={entry.rows}
            borrowAssets={borrowAssetsBySpoke[entry.spoke.id] ?? []}
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
            onViewMarket={onViewMarket}
            onUseAsCollateral={onUseAsCollateral}
            onBorrowAsset={onBorrowAssetMobile}
            deferContent={index > 0}
          />
        ))}
    </div>
  )
}

function SpokeMobileSection({
  spoke,
  rows,
  borrowAssets,
  pending,
  onViewMarket,
  onUseAsCollateral,
  onBorrowAsset,
  deferContent,
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  borrowAssets: BorrowableAsset[]
  pending: PendingMarketRow[]
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
  deferContent: boolean
}) {
  // Each spoke/category owns its own Collateral/Borrowable toggle.
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  const [expanded, setExpanded] = useState(false)
  const [contentMounted, setContentMounted] = useState(!deferContent)
  const sectionRef = useRef<HTMLElement | null>(null)
  const priceFor = usePriceFor()
  const { compact } = useCurrency()
  const { t } = useTranslation()
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_MOBILE_COLLATERAL_ROWS)
  const hiddenRowCount = Math.max(0, rows.length - visibleRows.length)

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

  // No `cv-section` here — content-visibility traps the sticky header. The title row
  // is `sticky top-16` so it hangs under the site header while this spoke's cards
  // scroll, then the next spoke's title takes over.
  return (
    <section ref={sectionRef} className="space-y-2">
      <div className="sticky top-16 z-20 -mx-1 flex items-center justify-between gap-3 bg-background px-1 pb-3 pt-2">
        <h3 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">{spoke.label}</h3>
        <SectionTabs
          activeTab={activeTab}
          onTabChange={(tab) => {
            setContentMounted(true)
            setActiveTab(tab)
          }}
        />
      </div>

      <div className="mt-4">
        {!contentMounted ? (
          <div
            aria-hidden
            className="min-h-[1080px] rounded-radius-md bg-table-row"
            data-testid="deferred-mobile-spoke-content"
          />
        ) : activeTab === "collateral" ? (
          <div className="space-y-3">
            <ul className="space-y-3">
              {visibleRows.map((pool) => (
                <li key={pool.id}>
                  <MarketMobileCard clickable onClick={() => onViewMarket(pool)}>
                    <MarketMobileCardHeader
                      identity={
                        <TokenPairCell
                          visuals={pool.visuals}
                          name={pool.name}
                          subtitle={
                            pairExchangeRateLabel(pool.visuals[0].symbol, pool.visuals[1].symbol, priceFor) ??
                            `${compact(pool.tvlUsd)} ${t("TVL")}`
                          }
                          size="md"
                        />
                      }
                      metric={
                        <MarketMobileMetric
                          value={formatApy((pool.aprMin + pool.aprMax) / 2)}
                          label={t("APY")}
                          valueClassName={aprToneClass((pool.aprMin + pool.aprMax) / 2)}
                        />
                      }
                    />
                    {pool.events && pool.events.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        <EventTagList events={pool.events} />
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between text-[12px] text-muted-foreground">
                      <DexChipRow dexes={pool.dexes} />
                      <TrendSpark
                        isPositive={pool.trendUp}
                        seed={`pool-${pool.id}`}
                        values={pool.trendValues}
                        width={52}
                      />
                    </div>
                    <MarketMobileStatList className="mt-3">
                      <MarketMobileStatRow label={t("Available")} value={compact(pool.availableUsd)} />
                      <MarketMobileStatRow label={t("Max LTV")} value={`${pool.ltv}%`} />
                      <MarketMobileStatRow label={t("Risk Premium")} value={formatRiskPremium(pool.riskPremiumBps)} />
                    </MarketMobileStatList>
                    <MarketMobilePrimaryAction
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      <ActionIcon label="Pledge" />
                      {t("Pledge")}
                    </MarketMobilePrimaryAction>
                  </MarketMobileCard>
                </li>
              ))}
              {pending.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-radius-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-elev-1"
                >
                  <span>
                    {row.label}
                    <span className="ml-1 text-xs">· {row.subLabel}</span>
                  </span>
                  <PillButton variant="ghost" disabled>
                    {t("Vote →")}
                  </PillButton>
                </li>
              ))}
            </ul>
            {hiddenRowCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex h-11 w-full items-center justify-center rounded-radius-lg border border-border bg-surface-raised text-[13px] font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                {t("View {count} more {spoke} markets")
                  .replace("{count}", String(hiddenRowCount))
                  .replace("{spoke}", spoke.label.replace(" Spoke", "").toLowerCase())}
              </button>
            ) : null}
          </div>
        ) : (
          <BorrowableAssetsPanel rows={borrowAssets} onBorrow={onBorrowAsset} groupByCategory={false} variant="loan" />
        )}
      </div>
    </section>
  )
}

export { getSpokeById }

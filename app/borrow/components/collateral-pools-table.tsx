"use client"

import { memo, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
  formatCompactUsd,
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
  return (
    <div className="flex flex-wrap gap-8 border-b border-border/50 md:border-b-0">
      {[
        { id: "collateral", label: "Markets" },
        { id: "borrow", label: "Assets" },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id as SectionTabId)}
            className={[
            "border-b-2 pb-2 text-left text-[15px] font-normal tracking-[-0.03em] transition-colors md:text-[17px]",
            activeTab === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80",
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
    <svg aria-hidden="true" viewBox="0 0 12 16" fill="none" className="size-[14px] text-muted-foreground/70 dark:text-white/60">
      <path d="M4 5 6 3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 11 6 13l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CollateralAssetCell({ pool }: { pool: BorrowPoolRow }) {
  const priceFor = usePriceFor()
  // Pair exchange rate (e.g. "1 ETH = 1,612 USDC") from the real price oracle;
  // falls back to TVL when either token is unpriced / the oracle is unavailable.
  const subtitle =
    pairExchangeRateLabel(pool.visuals[0].symbol, pool.visuals[1].symbol, priceFor) ??
    `${formatCompactUsd(pool.tvlUsd)} TVL`
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
        <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
          {pool.visuals[0].symbol} / {pool.visuals[1].symbol}
        </div>
        <div className="mt-1 truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
          {subtitle}
        </div>
      </div>
    </div>
  )
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
  const [sortKey, setSortKey] = useState<"asset" | "apy" | "ltv" | "risk" | "supplied">("asset")
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
          return (((a.aprMin + a.aprMax) / 2) - ((b.aprMin + b.aprMax) / 2)) * direction
        case "ltv":
          return (a.ltv - b.ltv) * direction
        case "risk":
          return (a.riskPremiumBps - b.riskPremiumBps) * direction
        case "supplied":
          return (a.availableUsd - b.availableUsd) * direction
        case "asset":
        default:
          return `${a.visuals[0].symbol}/${a.visuals[1].symbol}`.localeCompare(`${b.visuals[0].symbol}/${b.visuals[1].symbol}`) * direction
      }
    })
  }, [rows, sortDirection, sortKey])

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1020px] text-[12px]">
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
                    sortKey === "asset" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>ASSET</span>
                  <SortIcon />
                </button>
              </th>
              <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("apy")}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    sortKey === "apy" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>FEES</span>
                  <SortIcon />
                </button>
              </th>
              <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("ltv")}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    sortKey === "ltv" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>MAX LTV</span>
                  <SortIcon />
                </button>
              </th>
              <th className="pb-3 pt-4 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("risk")}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    sortKey === "risk" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>RISK PREMIUM</span>
                  <SortIcon />
                </button>
              </th>
              <th className="pb-3 pt-4 px-4 pr-6 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("supplied")}
                  className={cn(
                    "flex w-full items-center gap-2 transition-colors",
                    sortKey === "supplied" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>AVAILABLE</span>
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
                <td className={`py-2.5 pl-6 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${TABLE_ROW_HOVER_LEFT}`}>
                  {index + 1}
                </td>
                <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                  <CollateralAssetCell pool={pool} />
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{formatApy((pool.aprMin + pool.aprMax) / 2)}</span>
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{pool.ltv}%</span>
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${TABLE_ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{formatRiskPremium(pool.riskPremiumBps)}</span>
                </td>
                <td className={`py-2.5 px-4 ${TABLE_ROW_HOVER_BG}`}>
                  <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                    <span className="tabular-nums">{formatCompactUsd(pool.availableUsd)}</span>
                  </div>
                </td>
                <td className={`py-2.5 px-5 text-right ${TABLE_ROW_HOVER_RIGHT}`}>
                  <HoverActionGroup className="inline-flex items-center">
                    {onUseAsCollateral ? (
                      <PillButton
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          onUseAsCollateral(pool)
                        }}
                      >
                        Pledge
                      </PillButton>
                    ) : null}
                    <PillButton
                      variant="primary"
                      onClick={(event) => {
                        event.stopPropagation()
                        router.push(actionPagePath("borrow", "borrow", { market: pool.id, return: `/borrow/markets/${pool.id}` }))
                      }}
                    >
                      Borrow
                    </PillButton>
                  </HoverActionGroup>
                </td>
              </tr>
            ))}
            {pending.map((row) => (
              <tr key={row.id}>
                <td className="px-6 py-2.5 text-[12px] text-muted-foreground" colSpan={7}>
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
  return (
    <div className="hidden space-y-10 md:block">
      {groups.flatMap((group) =>
        group.spokes.map((entry) => (
          <SpokeDesktopSection
            key={entry.spoke.id}
            spoke={entry.spoke}
            rows={entry.rows}
            borrowAssets={borrowAssetsBySpoke[entry.spoke.id] ?? []}
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
            onViewMarket={onViewMarket}
            onUseAsCollateral={onUseAsCollateral}
            onBorrowAsset={onBorrowAssetDesktop}
          />
        )),
      )}
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
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  borrowAssets: BorrowableAsset[]
  pending: PendingMarketRow[]
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
}) {
  // Each spoke/category owns its own Markets/Assets toggle.
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  return (
    <section className="cv-section mb-2">
      <div className="mt-4 overflow-hidden rounded-radius-xl bg-transparent md:shadow-none">
        <div className="flex items-center justify-between gap-3 rounded-t-radius-xl bg-transparent px-1 py-2 md:px-4 md:py-3">
          <h3 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">{spoke.label}</h3>
          <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="bg-transparent">
          {activeTab === "collateral" ? (
            <CollateralDesktopTable rows={rows} pending={pending} onViewMarket={onViewMarket} onUseAsCollateral={onUseAsCollateral} embedded />
          ) : (
            <BorrowableAssetsPanel rows={borrowAssets} onBorrow={onBorrowAsset} groupByCategory={false} variant="loan" />
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
      {groups.flatMap((group) =>
        group.spokes.map((entry) => (
          <SpokeMobileSection
            key={entry.spoke.id}
            spoke={entry.spoke}
            rows={entry.rows}
            borrowAssets={borrowAssetsBySpoke[entry.spoke.id] ?? []}
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
            onViewMarket={onViewMarket}
            onUseAsCollateral={onUseAsCollateral}
            onBorrowAsset={onBorrowAssetMobile}
          />
        )),
      )}
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
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  borrowAssets: BorrowableAsset[]
  pending: PendingMarketRow[]
  onViewMarket: (pool: BorrowPoolRow) => void
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
}) {
  // Each spoke/category owns its own Markets/Assets toggle.
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  const [expanded, setExpanded] = useState(false)
  const priceFor = usePriceFor()
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_MOBILE_COLLATERAL_ROWS)
  const hiddenRowCount = Math.max(0, rows.length - visibleRows.length)

  return (
    <section className="cv-section space-y-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-normal tracking-tight text-foreground md:text-[18px]">{spoke.label}</h3>
        <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="mt-4">
        {activeTab === "collateral" ? (
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
                            `${formatCompactUsd(pool.tvlUsd)} TVL`
                          }
                          size="md"
                        />
                      }
                      metric={
                        <MarketMobileMetric
                          value={formatApy((pool.aprMin + pool.aprMax) / 2)}
                          label="APY"
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
                      <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} values={pool.trendValues} width={52} />
                    </div>
                    <MarketMobileStatList className="mt-3">
                      <MarketMobileStatRow label="Liquidity" value={formatCompactUsd(pool.availableUsd)} />
                      <MarketMobileStatRow label="Max LTV" value={`${pool.ltv}%`} />
                      <MarketMobileStatRow label="Risk Premium" value={formatRiskPremium(pool.riskPremiumBps)} />
                    </MarketMobileStatList>
                    <MarketMobilePrimaryAction
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      Supply
                    </MarketMobilePrimaryAction>
                  </MarketMobileCard>
                </li>
              ))}
              {pending.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-radius-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground shadow-elev-1">
                  <span>
                    {row.label}
                    <span className="ml-1 text-xs">· {row.subLabel}</span>
                  </span>
                  <PillButton variant="ghost" disabled>
                    Vote →
                  </PillButton>
                </li>
              ))}
            </ul>
            {hiddenRowCount > 0 ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex h-11 w-full items-center justify-center rounded-radius-lg border border-border bg-surface-raised text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
              >
                View {hiddenRowCount} more {spoke.label.replace(" Spoke", "").toLowerCase()} markets
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

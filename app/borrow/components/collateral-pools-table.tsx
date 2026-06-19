"use client"

import { memo, useMemo, useState } from "react"
import Link from "next/link"
import {
  aprToneClass,
  formatCompactUsd,
  formatRiskPremium,
  getBorrowAssetsForSpoke,
  getSpokeById,
  type BorrowPoolEvent,
  type BorrowPoolRow,
  type BorrowSpoke,
  type BorrowableAsset,
  type DexGroup,
  type PendingMarketRow,
} from "@/app/lib/data/borrow-domain"
import { BorrowableAssetsPanel } from "./borrowable-assets-table"
import { DexChipRow, PillButton, TokenBubble, TokenPairCell, TrendSpark } from "./atoms"
import { cn } from "@/lib/utils"
import { FlashValue } from "@/app/components/ui/live"

const ROW_HOVER_BG = "transition-colors group-hover:bg-slate-50 dark:group-hover:bg-[#131820]"
const ROW_HOVER_LEFT = `${ROW_HOVER_BG} group-hover:rounded-l-2xl`
const ROW_HOVER_RIGHT = `${ROW_HOVER_BG} group-hover:rounded-r-2xl`

function EventTagList({ events }: { events?: BorrowPoolEvent[] }) {
  if (!events || events.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap justify-end gap-1">
      {events.map((event, index) => {
        const tone = event.tone ?? "info"
        const toneClass =
          tone === "positive"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
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
  pending?: ReadonlyArray<PendingMarketRow>
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
        { id: "collateral", label: "Collateral" },
        { id: "borrow", label: "Borrowable" },
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
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex items-center">
        <span className="relative z-[1]">
          <TokenBubble visual={pool.visuals[0]} size="xl" ring={false} className="bg-transparent" />
        </span>
        <span className="-ml-3">
          <TokenBubble visual={pool.visuals[1]} size="xl" ring={false} className="bg-transparent" />
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white/88">
          {pool.visuals[0].symbol} / {pool.visuals[1].symbol}
        </div>
        <div className="mt-1 truncate text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
          {formatCompactUsd(pool.tvlUsd)} TVL
        </div>
      </div>
    </div>
  )
}

function formatPairAmount(value: number, pool: BorrowPoolRow) {
  return `${formatCompactUsd(value).replace(/^\$/, "")} ${pool.visuals[0].symbol} / ${pool.visuals[1].symbol}`
}

function CollateralDesktopTable({
  rows,
  pending,
  onUseAsCollateral,
  embedded = false,
}: {
  rows: ReadonlyArray<BorrowPoolRow>
  pending: ReadonlyArray<PendingMarketRow>
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  embedded?: boolean
}) {
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
      <table className="w-full min-w-[920px] text-[12px]">
          <thead>
                <tr className="bg-slate-50 text-left text-muted-foreground dark:bg-[#131820] dark:text-white/52">
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
                  <span>TOTAL SUPPLIED</span>
                  <SortIcon />
                </button>
              </th>
            </tr>
          </thead>
          <tbody key={`collateral-${sortKey}-${sortDirection}-${sortedRows.length}`}>
              {sortedRows.map((pool, index) => (
                <tr
                  key={pool.id}
                  className="asset-swap group cursor-pointer transition-colors"
                  onClick={() => onUseAsCollateral(pool)}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                <td className={`py-2.5 pl-6 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${ROW_HOVER_LEFT}`}>
                  {index + 1}
                </td>
                <td className={`py-2.5 px-4 ${ROW_HOVER_BG}`}>
                  <CollateralAssetCell pool={pool} />
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%</span>
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{pool.ltv}%</span>
                </td>
                <td className={`py-2.5 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84 ${ROW_HOVER_BG}`}>
                  <span className="tabular-nums">{formatRiskPremium(pool.riskPremiumBps)}</span>
                </td>
                <td className={`py-2.5 px-6 ${ROW_HOVER_RIGHT}`}>
                  <div className="text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                    <span className="tabular-nums">{formatPairAmount(pool.availableUsd, pool)}</span>
                  </div>
                  <div className="mt-1 text-[13px] font-normal tracking-[-0.03em] text-muted-foreground dark:text-white/38">
                    {formatCompactUsd(pool.availableUsd)}
                  </div>
                </td>
              </tr>
            ))}
            {pending.map((row) => (
              <tr key={row.id}>
                <td className="px-6 py-2.5 text-[12px] text-muted-foreground" colSpan={6}>
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

  return <div className="overflow-hidden rounded-[20px] bg-transparent">{table}</div>
}

export const CollateralPoolsTable = memo(function CollateralPoolsTable({
  groups,
  pending = [],
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
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
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
  pending,
  onUseAsCollateral,
  onBorrowAsset,
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  pending: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
}) {
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  const borrowAssets = useMemo(() => getBorrowAssetsForSpoke(spoke.id), [spoke.id])

  return (
    <section className="mb-2">
      <div className="mt-4 overflow-hidden rounded-[20px] bg-transparent md:shadow-none">
        <div className="flex flex-col gap-3 rounded-t-[20px] bg-transparent px-1 py-2 md:flex-row md:items-center md:gap-4 md:px-4 md:py-3">
          <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <h3 className="text-[16px] font-normal tracking-tight text-foreground md:ml-auto md:text-[18px]">
            {spoke.label}
          </h3>
        </div>
        <div className="bg-transparent">
          {activeTab === "collateral" ? (
            <CollateralDesktopTable rows={rows} pending={pending} onUseAsCollateral={onUseAsCollateral} embedded />
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
  pending = [],
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
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
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
  pending,
  onUseAsCollateral,
  onBorrowAsset,
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  pending: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAsset: (asset: BorrowableAsset) => void
}) {
  const [activeTab, setActiveTab] = useState<SectionTabId>("collateral")
  const [expanded, setExpanded] = useState(false)
  const borrowAssets = useMemo(() => getBorrowAssetsForSpoke(spoke.id), [spoke.id])
  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_MOBILE_COLLATERAL_ROWS)
  const hiddenRowCount = Math.max(0, rows.length - visibleRows.length)

  return (
    <section className="space-y-2">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-4 md:rounded-[18px] md:border md:border-black/5 md:bg-transparent md:px-4 md:py-2 md:shadow-none dark:md:border-white/10">
        <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <h3 className="text-[16px] font-normal tracking-tight text-foreground md:ml-auto md:text-[18px]">
          {spoke.label}
        </h3>
      </div>

      <div className="mt-4">
        {activeTab === "collateral" ? (
          <div className="overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
            <ul className="divide-y divide-border">
              {visibleRows.map((pool) => (
                <li key={pool.id} className="space-y-3 px-4 py-4" onClick={() => onUseAsCollateral(pool)}>
                  <div className="flex items-center justify-between gap-3">
                    <TokenPairCell
                      visuals={pool.visuals}
                      name={pool.name}
                      subtitle={`${formatCompactUsd(pool.tvlUsd)} TVL`}
                      size="md"
                    />
                    <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} values={pool.trendValues} width={52} />
                  </div>
                  {pool.events && pool.events.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      <EventTagList events={pool.events} />
                    </div>
                  ) : null}
                  <DexChipRow dexes={pool.dexes} />
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <MobileField label="Max LTV" value={`${pool.ltv}%`} />
                    <MobileField
                      label="APY"
                      value={`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`}
                      tone={aprToneClass((pool.aprMin + pool.aprMax) / 2)}
                      flashValue={(pool.aprMin + pool.aprMax) / 2}
                      flashGoodDirection="down"
                    />
                    <MobileField
                      label="Supplied"
                      value={formatCompactUsd(pool.availableUsd)}
                      flashValue={pool.availableUsd}
                      flashGoodDirection="up"
                    />
                    <MobileField label="Risk Premium" value={formatRiskPremium(pool.riskPremiumBps)} />
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/borrow/pool/${pool.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="flex h-9 flex-1 items-center justify-center rounded-xs border border-border bg-surface-raised text-[13px] font-medium text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
                    >
                      Details
                    </Link>
                    <PillButton
                      variant="primary"
                      size="md"
                      className="flex-1"
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      Supply
                    </PillButton>
                  </div>
                </li>
              ))}
              {pending.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
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
                className="flex h-11 w-full items-center justify-center border-t border-border bg-surface-raised text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
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

function MobileField({
  label,
  value,
  tone,
  flashValue,
  flashGoodDirection,
}: {
  label: string
  value: string
  tone?: string
  flashValue?: number | string
  flashGoodDirection?: "up" | "down"
}) {
  return (
    <div>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      {flashValue !== undefined ? (
        <FlashValue
          value={flashValue}
          goodDirection={flashGoodDirection ?? "up"}
          className={cn("mt-0.5 font-data text-[13px] font-medium tabular-nums text-foreground", tone)}
        >
          {value}
        </FlashValue>
      ) : (
        <div className={cn("mt-0.5 font-data text-[13px] font-medium tabular-nums text-foreground", tone)}>{value}</div>
      )}
    </div>
  )
}

export { getSpokeById }

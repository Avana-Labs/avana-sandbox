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
} from "@/app/lib/borrow-sim"
import { AssetsPanel } from "./assets-table"
import { DexChipRow, PillButton, TokenBubble, TokenPairCell, TrendSpark } from "./atoms"
import { cn } from "@/lib/utils"
import { FlashValue } from "@/app/components/ui/live"

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

type PoolsTableProps = {
  groups: DexGroup[]
  pending?: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
  onBorrowAssetDesktop: (asset: BorrowableAsset) => void
  onBorrowAssetMobile: (asset: BorrowableAsset) => void
}

type SectionTabId = "collateral" | "borrow"

function SectionTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: SectionTabId
  onTabChange: (tab: SectionTabId) => void
}) {
  return (
    <div className="flex flex-wrap gap-8 border-b border-border/50">
      {[
        { id: "collateral", label: "Collateral" },
        { id: "borrow", label: "Loan" },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id as SectionTabId)}
          className={[
            "border-b-2 pb-2 text-left text-[14px] font-medium tracking-[-0.02em] transition-colors md:text-[14px]",
            activeTab === tab.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function EModePill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs border border-accent-emphasis/30 bg-accent-emphasis-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-accent-emphasis dark:text-accent-emphasis">
      E-Mode
    </span>
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
          {pool.feeTier} fee · {formatCompactUsd(pool.tvlUsd)} TVL
        </div>
      </div>
    </div>
  )
}

function CollateralDesktopTable({
  rows,
  pending,
  onUseAsCollateral,
}: {
  rows: BorrowPoolRow[]
  pending: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
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

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-white shadow-elev-1 dark:border-white/6 dark:bg-[#171717] dark:shadow-[0_1px_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-[12px]">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground dark:border-white/6 dark:text-white/52">
              <th className="pb-3 pt-4 pl-6 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
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
              <th className="pb-3 pt-4 px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("apy")}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    sortKey === "apy" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>TRADING APY</span>
                  <SortIcon />
                </button>
              </th>
              <th className="pb-3 pt-4 px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
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
              <th className="pb-3 pt-4 px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
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
              <th className="pb-3 pt-4 pr-6 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                <button
                  type="button"
                  onClick={() => toggleSort("supplied")}
                  className={cn(
                    "ml-auto flex items-center gap-2 transition-colors",
                    sortKey === "supplied" ? "text-foreground dark:text-white/90" : "text-muted-foreground/70 dark:text-white/42",
                  )}
                >
                  <span>TOTAL SUPPLIED</span>
                  <SortIcon />
                </button>
              </th>
            </tr>
          </thead>
          <tbody key={`collateral-${sortKey}-${sortDirection}-${sortedRows.length}`} className="divide-y divide-border dark:divide-white/6">
            {sortedRows.map((pool, index) => (
              <tr
                key={pool.id}
                className="asset-swap group cursor-pointer border-t border-border transition-colors hover:bg-surface-1 dark:border-white/6 dark:hover:bg-white/[0.015]"
                onClick={() => onUseAsCollateral(pool)}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <td className="py-4 pl-6 pr-4">
                  <CollateralAssetCell pool={pool} />
                </td>
                <td className="py-4 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                  <span className="tabular-nums">{((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%</span>
                </td>
                <td className="py-4 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                  <span className="tabular-nums">{pool.ltv}%</span>
                </td>
                <td className="py-4 px-4 text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                  <span className="tabular-nums">{formatRiskPremium(pool.riskPremiumBps)}</span>
                </td>
                <td className="py-4 px-6 text-right text-[15px] font-normal tracking-[-0.03em] text-foreground dark:text-white/84">
                  <span className="tabular-nums">{formatCompactUsd(pool.availableUsd)}</span>
                </td>
              </tr>
            ))}
            {pending.map((row) => (
              <tr key={row.id}>
                <td className="px-6 py-4 text-[12px] text-muted-foreground" colSpan={5}>
                  {row.label}
                  <span className="ml-2 text-[12px] text-muted-foreground">· {row.subLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const PoolsTable = memo(function PoolsTable({ groups, pending = [], onUseAsCollateral, onBorrowAssetDesktop }: PoolsTableProps) {
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 py-2">
        <h3 className="text-[18px] font-medium tracking-tight md:text-[20px]">{spoke.label}</h3>
        {spoke.eMode ? <EModePill /> : null}
      </div>

      <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === "collateral" ? (
          <CollateralDesktopTable rows={rows} pending={pending} onUseAsCollateral={onUseAsCollateral} />
        ) : (
          <AssetsPanel rows={borrowAssets} onBorrow={onBorrowAsset} groupByCategory={false} variant="loan" />
        )}
      </div>
    </section>
  )
}

export function PoolsList({ groups, pending = [], onUseAsCollateral, onBorrowAssetMobile }: PoolsTableProps) {
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
  const borrowAssets = useMemo(() => getBorrowAssetsForSpoke(spoke.id), [spoke.id])

  return (
    <section className="space-y-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[18px] font-medium tracking-tight md:text-[20px]">{spoke.label}</h3>
        {spoke.eMode ? <EModePill /> : null}
      </div>

      <SectionTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4">
        {activeTab === "collateral" ? (
          <div className="overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
            <ul className="divide-y divide-border">
              {rows.map((pool) => (
                <li key={pool.id} className="space-y-3 px-4 py-4" onClick={() => onUseAsCollateral(pool)}>
                  <div className="flex items-center justify-between gap-3">
                    <TokenPairCell
                      visuals={pool.visuals}
                      name={pool.name}
                      subtitle={`${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`}
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
          </div>
        ) : (
          <AssetsPanel rows={borrowAssets} onBorrow={onBorrowAsset} groupByCategory={false} variant="loan" />
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

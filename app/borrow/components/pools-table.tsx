"use client"

import { memo } from "react"
import Link from "next/link"
import {
  aprToneClass,
  formatCompactUsd,
  formatRiskPremium,
  getSpokeById,
  type BorrowPoolEvent,
  type BorrowPoolRow,
  type BorrowSpoke,
  type DexGroup,
  type PendingMarketRow,
} from "@/app/lib/borrow-sim"
import {
  DexChipRow,
  PillButton,
  TokenPairCell,
  TrendSpark,
} from "./atoms"
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
}

function EModePill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs border border-accent-emphasis/30 bg-accent-emphasis-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-accent-emphasis dark:text-accent-emphasis">
      E-Mode
    </span>
  )
}

export const PoolsTable = memo(function PoolsTable({ groups, pending = [], onUseAsCollateral }: PoolsTableProps) {
  return (
    <div className="hidden space-y-10 md:block">
      {groups.flatMap((group) =>
        group.spokes.map((entry) => (
          <SpokeSection
            key={entry.spoke.id}
            spoke={entry.spoke}
            rows={entry.rows}
            pending={pending.filter((row) => row.spoke === entry.spoke.id)}
            onUseAsCollateral={onUseAsCollateral}
          />
        )),
      )}
    </div>
  )
})

function SpokeSection({
  spoke,
  rows,
  pending,
  onUseAsCollateral,
}: {
  spoke: BorrowSpoke
  rows: BorrowPoolRow[]
  pending: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
}) {
  return (
    <section className="mb-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-medium tracking-tight">{spoke.label}</h3>
        {spoke.eMode ? <EModePill /> : null}
      </div>
      <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Pool</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Max LTV</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Fees APY</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Supplied</th>
                <th className="pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Risk Premium</th>
                <th className="w-20 pb-2 pt-3 pl-4 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">7D</th>
                <th className="w-44 pb-2 pt-3 pl-4 pr-5 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((pool) => (
                <tr
                  key={pool.id}
                  className="cursor-pointer transition-colors hover:bg-surface-inset/60"
                  onClick={() => onUseAsCollateral(pool)}
                >
                  <td className="py-2.5 pl-5">
                    <TokenPairCell
                      visuals={pool.visuals}
                      name={pool.name}
                      subtitle={`${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`}
                      size="md"
                    />
                    <EventTagList events={pool.events} />
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <span className="font-data text-[13px] font-medium tabular-nums text-foreground">{pool.ltv}%</span>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <FlashValue
                      value={(pool.aprMin + pool.aprMax) / 2}
                      goodDirection="down"
                      className={cn("font-data text-[13px] font-medium tabular-nums", aprToneClass((pool.aprMin + pool.aprMax) / 2))}
                    >
                      {`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`}
                    </FlashValue>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <FlashValue value={pool.availableUsd} goodDirection="up" className="font-data text-[13px] tabular-nums text-foreground">
                      {formatCompactUsd(pool.availableUsd)}
                    </FlashValue>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <span
                      className={cn(
                        "font-data text-[13px] font-medium tabular-nums",
                        pool.riskPremiumBps >= 100 ? "text-rose-600" : pool.riskPremiumBps >= 60 ? "text-amber-600" : "text-emerald-600",
                      )}
                    >
                      {formatRiskPremium(pool.riskPremiumBps)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-4 text-right">
                    <div className="inline-flex align-middle">
                      <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} values={pool.trendValues} />
                    </div>
                  </td>
                  <td className="py-2.5 pl-4 pr-5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/borrow/pool/${pool.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-7 items-center rounded-xs border border-border bg-surface-raised px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
                      >
                        Details
                      </Link>
                      <PillButton
                        variant="primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          onUseAsCollateral(pool)
                        }}
                      >
                        Supply
                      </PillButton>
                    </div>
                  </td>
                </tr>
              ))}
              {pending.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pl-6 text-xs text-muted-foreground" />
                  <td className="py-3 text-sm text-muted-foreground" colSpan={6}>
                    {row.label}
                    <span className="ml-2 text-xs text-muted-foreground">· {row.subLabel}</span>
                  </td>
                  <td className="py-3 pr-6 text-right">
                    <PillButton variant="ghost" disabled>
                      Vote →
                    </PillButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function PoolsList({ groups, pending = [], onUseAsCollateral }: PoolsTableProps) {
  return (
    <div className="space-y-8 md:hidden">
      {groups.flatMap((group) =>
        group.spokes.map((entry) => {
          const pendingForSpoke = pending.filter((row) => row.spoke === entry.spoke.id)
          return (
            <section key={entry.spoke.id} className="space-y-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[14px] font-medium tracking-tight">{entry.spoke.label}</h3>
                {entry.spoke.eMode ? <EModePill /> : null}
              </div>
              <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
                <ul className="divide-y divide-border">
                {entry.rows.map((pool) => (
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
                        label="Fees APY"
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
                {pendingForSpoke.map((row) => (
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
            </section>
          )
        }),
      )}
    </div>
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

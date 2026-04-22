"use client"

import { memo } from "react"
import {
  aprToneClass,
  formatCompactUsd,
  formatRiskPremium,
  getSpokeById,
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

type PoolsTableProps = {
  groups: DexGroup[]
  pending?: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
}

function EModePill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
      E-Mode
    </span>
  )
}

function SpokeHeader({ spoke }: { spoke: BorrowSpoke }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
      <h3 className="text-[20px] font-semibold tracking-tight text-foreground">{spoke.label}</h3>
      {spoke.eMode ? <EModePill /> : null}
    </div>
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
    <section>
      <SpokeHeader spoke={spoke} />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                <th className="px-2 py-3">Pool</th>
                <th className="px-2 py-3 text-right">Max LTV</th>
                <th className="px-2 py-3 text-right">Fees APY</th>
                <th className="px-2 py-3 text-right">Available</th>
                <th className="px-2 py-3 text-right">Risk Premium</th>
                <th className="w-24 px-2 py-3 text-right">7D</th>
                <th className="w-36 px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pool) => (
                <tr
                  key={pool.id}
                  className="border-t border-border transition-colors hover:bg-muted/70"
                  onClick={() => onUseAsCollateral(pool)}
                >
                  <td className="px-2 py-3.5">
                    <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} size="lg" />
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className="font-data text-sm font-semibold tabular-nums text-foreground">{pool.ltv}%</span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-sm font-semibold tabular-nums", aprToneClass((pool.aprMin + pool.aprMax) / 2))}>
                      {`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-foreground">
                    {formatCompactUsd(pool.availableUsd)}
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span
                      className={cn(
                        "font-data text-sm font-medium tabular-nums",
                        pool.riskPremiumBps >= 100 ? "text-rose-600" : pool.riskPremiumBps >= 60 ? "text-amber-600" : "text-emerald-600",
                      )}
                    >
                      {formatRiskPremium(pool.riskPremiumBps)}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <div className="inline-flex align-middle">
                      <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <PillButton
                      variant="primary"
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      Supply
                    </PillButton>
                  </td>
                </tr>
              ))}
              {pending.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3.5 text-xs text-muted-foreground" />
                  <td className="px-2 py-3.5 text-sm text-muted-foreground" colSpan={6}>
                    {row.label}
                    <span className="ml-2 text-xs text-muted-foreground">· {row.subLabel}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
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
            <section key={entry.spoke.id} className="space-y-3">
              <SpokeHeader spoke={entry.spoke} />

              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {entry.rows.map((pool) => (
                  <li key={pool.id} className="space-y-3 px-4 py-4" onClick={() => onUseAsCollateral(pool)}>
                    <div className="flex items-center justify-between gap-3">
                      <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} size="md" />
                      <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} width={52} />
                    </div>
                    <DexChipRow dexes={pool.dexes} />
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <MobileField label="Max LTV" value={`${pool.ltv}%`} />
                      <MobileField
                        label="Fees APY"
                        value={`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`}
                        tone={aprToneClass((pool.aprMin + pool.aprMax) / 2)}
                      />
                      <MobileField label="Available" value={formatCompactUsd(pool.availableUsd)} />
                      <MobileField label="Risk Premium" value={formatRiskPremium(pool.riskPremiumBps)} />
                    </div>
                    <PillButton
                      variant="primary"
                      size="md"
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation()
                        onUseAsCollateral(pool)
                      }}
                    >
                      Supply
                    </PillButton>
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
            </section>
          )
        }),
      )}
    </div>
  )
}

function MobileField({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.07em] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-data text-sm font-semibold tabular-nums text-foreground", tone)}>{value}</div>
    </div>
  )
}

export { getSpokeById }

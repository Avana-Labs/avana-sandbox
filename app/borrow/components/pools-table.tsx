"use client"

import { memo } from "react"
import {
  BORROW_SPOKES,
  aprToneClass,
  formatCompactUsd,
  formatRiskPremium,
  getSpokeById,
  type BorrowPoolRow,
  type BorrowSpoke,
  type BorrowSpokeId,
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
  groups: Record<BorrowSpokeId, BorrowPoolRow[]>
  pending?: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
}

export const PoolsTable = memo(function PoolsTable({ groups, pending = [], onUseAsCollateral }: PoolsTableProps) {
  const visibleSpokes = BORROW_SPOKES.filter(
    (spoke) => (groups[spoke.id]?.length ?? 0) > 0 || pending.some((row) => row.spoke === spoke.id),
  )

  return (
    <div className="hidden space-y-8 md:block">
      {visibleSpokes.map((spoke) => (
        <SpokeSection
          key={spoke.id}
          spoke={spoke}
          rows={groups[spoke.id] ?? []}
          pending={pending.filter((row) => row.spoke === spoke.id)}
          onUseAsCollateral={onUseAsCollateral}
        />
      ))}
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
  const shortLabel = spoke.label.replace(" Spoke", "")

  return (
    <section>
      <div className="mb-3 px-1">
        <h3 className="text-base font-semibold text-slate-900">{shortLabel}</h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-sm font-medium text-slate-500">
                <th className="w-10 px-4 py-3">#</th>
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
              {rows.map((pool, idx) => (
                <tr
                  key={pool.id}
                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  onClick={() => onUseAsCollateral(pool)}
                >
                  <td className="px-4 py-3.5 text-xs text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-2 py-3.5">
                    <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} />
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className="font-data text-sm font-semibold tabular-nums text-slate-900">{pool.ltv}%</span>
                  </td>
                  <td className="px-2 py-3.5 text-right">
                    <span className={cn("font-data text-sm font-semibold tabular-nums", aprToneClass((pool.aprMin + pool.aprMax) / 2))}>
                      {`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-slate-900">
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
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3.5 text-xs text-slate-300" />
                  <td className="px-2 py-3.5 text-sm text-slate-400" colSpan={6}>
                    {row.label}
                    <span className="ml-2 text-xs text-slate-400">· {row.subLabel}</span>
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
  const visibleSpokes = BORROW_SPOKES.filter((spoke) => (groups[spoke.id]?.length ?? 0) > 0 || pending.some((row) => row.spoke === spoke.id))
  return (
    <div className="space-y-6 md:hidden">
      {visibleSpokes.map((spoke) => {
        const rows = groups[spoke.id] ?? []
        const pendingForSpoke = pending.filter((row) => row.spoke === spoke.id)
        return (
          <section key={spoke.id} className="space-y-3">
            <div className="px-1">
              <h3 className="text-base font-semibold text-slate-900">{spoke.label.replace(" Spoke", "")}</h3>
            </div>
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
              {rows.map((pool) => (
                <li key={pool.id} className="space-y-3 px-4 py-4" onClick={() => onUseAsCollateral(pool)}>
                  <div className="flex items-center justify-between gap-3">
                    <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} />
                    <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} width={52} />
                  </div>
                  <DexChipRow dexes={pool.dexes} />
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <MobileField label="Max LTV" value={`${pool.ltv}%`} />
                    <MobileField label="Fees APY" value={`${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}%`} tone={aprToneClass((pool.aprMin + pool.aprMax) / 2)} />
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
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
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
      })}
    </div>
  )
}

function MobileField({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.07em] text-slate-400">{label}</div>
      <div className={cn("mt-0.5 font-data text-sm font-semibold tabular-nums text-slate-900", tone)}>{value}</div>
    </div>
  )
}

export { getSpokeById }

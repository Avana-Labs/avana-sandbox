"use client"

import { Fragment, memo } from "react"
import {
  BORROW_SPOKES,
  aprRangeLabel,
  aprToneClass,
  formatCompactUsd,
  formatRiskPremium,
  getSpokeById,
  type BorrowPoolRow,
  type BorrowSpokeId,
  type PendingMarketRow,
} from "@/app/lib/borrow-sim"
import {
  BorrowableTokenRow,
  DexChipRow,
  DeltaPill,
  PillButton,
  SpokeDot,
  TokenPairCell,
  TrendSpark,
} from "./atoms"
import { cn } from "@/lib/utils"

type PoolsTableProps = {
  groups: Record<BorrowSpokeId, BorrowPoolRow[]>
  pending?: PendingMarketRow[]
  onUseAsCollateral: (pool: BorrowPoolRow) => void
}

const COLUMN_COUNT = 10

export const PoolsTable = memo(function PoolsTable({ groups, pending = [], onUseAsCollateral }: PoolsTableProps) {
  const visibleSpokes = BORROW_SPOKES.filter((spoke) => (groups[spoke.id]?.length ?? 0) > 0 || pending.some((row) => row.spoke === spoke.id))
  let rowIndex = 0

  return (
    <div className="hidden md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-medium text-slate-500">
              <th className="w-10 px-2 py-3">#</th>
              <th className="px-2 py-3">Pool</th>
              <th className="px-2 py-3">Spoke</th>
              <th className="px-2 py-3">DEXes</th>
              <th className="px-2 py-3">Borrowable</th>
              <th className="px-2 py-3 text-right">Max LTV</th>
              <th className="px-2 py-3 text-right">Borrow APR</th>
              <th className="px-2 py-3 text-right">Available</th>
              <th className="px-2 py-3 text-right">Risk Premium</th>
              <th className="px-2 py-3 text-right">7D</th>
              <th className="w-36 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleSpokes.map((spoke) => {
              const rows = groups[spoke.id] ?? []
              const pendingForSpoke = pending.filter((row) => row.spoke === spoke.id)
              return (
                <Fragment key={spoke.id}>
                  <tr className="bg-slate-50/60">
                    <td colSpan={COLUMN_COUNT + 1} className="px-2 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <SpokeDot spoke={spoke} />
                          <span className="text-[12px] text-slate-500">{spoke.description}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[11.5px] text-slate-600">
                          <span>
                            Up to <span className="font-data font-semibold text-slate-900">{spoke.maxLtv}%</span>
                          </span>
                          <span className="font-data font-semibold text-slate-900">{formatCompactUsd(spoke.liquidityUsd)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {rows.map((pool) => {
                    rowIndex += 1
                    return (
                      <tr
                        key={pool.id}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                        onClick={() => onUseAsCollateral(pool)}
                      >
                        <td className="px-2 py-3.5 text-[12px] text-slate-400 tabular-nums">{rowIndex}</td>
                        <td className="px-2 py-3.5">
                          <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} />
                        </td>
                        <td className="px-2 py-3.5">
                          <SpokeDot spoke={spoke} />
                        </td>
                        <td className="px-2 py-3.5">
                          <DexChipRow dexes={pool.dexes} />
                        </td>
                        <td className="px-2 py-3.5">
                          <BorrowableTokenRow visuals={pool.borrowableTokens} />
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <span className="font-data text-[13px] font-semibold tabular-nums text-slate-900">{pool.ltv}%</span>
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <span className={cn("font-data text-[13px] font-semibold tabular-nums", aprToneClass((pool.aprMin + pool.aprMax) / 2))}>
                            {aprRangeLabel(pool)}
                          </span>
                        </td>
                        <td className="px-2 py-3.5 text-right font-data text-[13px] tabular-nums text-slate-900">
                          {formatCompactUsd(pool.availableUsd)}
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <span
                            className={cn(
                              "font-data text-[12.5px] font-medium tabular-nums",
                              pool.riskPremiumBps >= 100 ? "text-rose-600" : pool.riskPremiumBps >= 60 ? "text-amber-600" : "text-emerald-600",
                            )}
                          >
                            {formatRiskPremium(pool.riskPremiumBps)}
                          </span>
                        </td>
                        <td className="px-2 py-3.5">
                          <div className="flex justify-end">
                            <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} />
                          </div>
                        </td>
                        <td className="px-2 py-3.5 text-right">
                          <PillButton
                            variant="primary"
                            onClick={(event) => {
                              event.stopPropagation()
                              onUseAsCollateral(pool)
                            }}
                          >
                            Borrow
                          </PillButton>
                        </td>
                      </tr>
                    )
                  })}
                  {pendingForSpoke.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-2 py-3.5 text-[12px] text-slate-300" />
                      <td className="px-2 py-3.5 text-[12.5px] text-slate-400" colSpan={9}>
                        {row.label}
                        <span className="ml-2 text-[11px] text-slate-400">· {row.subLabel}</span>
                      </td>
                      <td className="px-2 py-3.5 text-right">
                        <PillButton variant="ghost" disabled>
                          Vote →
                        </PillButton>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})

export function PoolsList({ groups, pending = [], onUseAsCollateral }: PoolsTableProps) {
  const visibleSpokes = BORROW_SPOKES.filter((spoke) => (groups[spoke.id]?.length ?? 0) > 0 || pending.some((row) => row.spoke === spoke.id))
  return (
    <div className="space-y-6 md:hidden">
      {visibleSpokes.map((spoke) => {
        const rows = groups[spoke.id] ?? []
        const pendingForSpoke = pending.filter((row) => row.spoke === spoke.id)
        return (
          <section key={spoke.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SpokeDot spoke={spoke} />
                <p className="mt-1 max-w-[260px] text-[11.5px] text-slate-500">{spoke.description}</p>
              </div>
              <div className="text-right text-[11.5px] text-slate-600">
                <div>
                  Max LTV <span className="font-data font-semibold text-slate-900">{spoke.maxLtv}%</span>
                </div>
                <div className="font-data font-semibold text-slate-900">{formatCompactUsd(spoke.liquidityUsd)}</div>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
              {rows.map((pool) => (
                <li key={pool.id} className="space-y-3 px-4 py-4" onClick={() => onUseAsCollateral(pool)}>
                  <div className="flex items-center justify-between gap-3">
                    <TokenPairCell visuals={pool.visuals} name={pool.name} subtitle={pool.venue} />
                    <TrendSpark isPositive={pool.trendUp} seed={`pool-${pool.id}`} width={52} />
                  </div>
                  <DexChipRow dexes={pool.dexes} />
                  <div className="grid grid-cols-2 gap-y-2 text-[12px]">
                    <MobileField label="Max LTV" value={`${pool.ltv}%`} />
                    <MobileField label="Borrow APR" value={aprRangeLabel(pool)} tone={aprToneClass((pool.aprMin + pool.aprMax) / 2)} />
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
                    Borrow
                  </PillButton>
                </li>
              ))}
              {pendingForSpoke.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[12px] text-slate-400">
                  <span>
                    {row.label}
                    <span className="ml-1 text-[11px]">· {row.subLabel}</span>
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
      <div className="text-[10.5px] uppercase tracking-[0.07em] text-slate-400">{label}</div>
      <div className={cn("mt-0.5 font-data text-[13px] font-semibold tabular-nums text-slate-900", tone)}>{value}</div>
    </div>
  )
}

export { getSpokeById }

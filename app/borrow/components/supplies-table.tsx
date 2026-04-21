"use client"

import {
  BORROW_SUPPLY_META,
  formatCompactUsd,
  formatUsdExact,
  getSpokeById,
  healthFactorToneClass,
  homePoolSpoke,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HOME_COLLATERAL_POOLS, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
import { HfNumber, PillButton, SpokeDot, StatsStrip, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

export type SupplyRowContext = {
  pool: HomeCollateralPool
  borrowedUsd: number
  healthFactor: number | null
}

type SuppliesTableProps = {
  rows: SupplyRowContext[]
  totals: { collateral: number; borrowed: number; available: number; fees: number; averageHf: number | null }
  onBorrowMore: (context: SupplyRowContext) => void
  onRemove: (context: SupplyRowContext) => void
}

export function SuppliesPanel({ rows, totals, onBorrowMore, onRemove }: SuppliesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
        You don&apos;t have any supply positions yet. Provide liquidity on the <span className="font-semibold text-slate-800">Pools to Supply</span> tab to unlock borrow power.
      </div>
    )
  }
  return (
    <div>
      <StatsStrip
        items={[
          { label: "Total Collateral", value: formatUsdExact(totals.collateral) },
          { label: "Borrowed", value: formatUsdExact(totals.borrowed) },
          { label: "Available", value: formatUsdExact(totals.available) },
          { label: "Fees Earned", value: formatUsdExact(totals.fees) },
          {
            label: "Avg HF",
            value: formatHealthFactor(totals.averageHf),
            tone: healthFactorToneClass(totals.averageHf),
          },
        ]}
      />

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-medium text-slate-500">
                <th className="w-10 px-2 py-3">#</th>
                <th className="px-2 py-3">LP Position</th>
                <th className="px-2 py-3">Spoke</th>
                <th className="px-2 py-3 text-right">Collateral</th>
                <th className="px-2 py-3 text-right">Max Borrow</th>
                <th className="px-2 py-3 text-right">Borrowed</th>
                <th className="px-2 py-3 text-right">Health Factor</th>
                <th className="px-2 py-3 text-right">Fees Earned</th>
                <th className="px-2 py-3 text-right">LP APR</th>
                <th className="w-52 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const spoke = getSpokeById(homePoolSpoke(row.pool.category))
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const borrowPct = row.pool.borrowPowerUsd > 0 ? Math.round((row.borrowedUsd / row.pool.borrowPowerUsd) * 100) : 0
                const hfTone = healthFactorToneClass(row.healthFactor)
                return (
                  <tr key={row.pool.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="px-2 py-3.5 text-[12px] text-slate-400 tabular-nums">{index + 1}</td>
                    <td className="px-2 py-3.5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} />
                    </td>
                    <td className="px-2 py-3.5">
                      <SpokeDot spoke={spoke} />
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-[13px] tabular-nums text-slate-900">
                      {formatCompactUsd(row.pool.collateralUsd)}
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-[13px] tabular-nums text-slate-900">
                      {formatCompactUsd(row.pool.borrowPowerUsd)}
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-slate-900">{formatCompactUsd(row.borrowedUsd)}</div>
                      <div className="text-[10.5px] text-slate-400">{borrowPct}% of power</div>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <HfNumber value={formatHealthFactor(row.healthFactor)} tone={hfTone} />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-slate-900">{meta?.feesLabel ?? "$0.00"}</div>
                      <div className="text-[10.5px] text-slate-400">{meta?.feesBreakdown ?? "—"}</div>
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-[13px] font-semibold tabular-nums text-emerald-600">
                      {row.pool.pairApr.toFixed(1)}%
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <PillButton variant="ghost" onClick={() => onRemove(row)}>
                          Remove
                        </PillButton>
                        <PillButton variant="primary" onClick={() => onBorrowMore(row)}>
                          Borrow
                        </PillButton>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => {
          const spoke = getSpokeById(homePoolSpoke(row.pool.category))
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const borrowPct = row.pool.borrowPowerUsd > 0 ? Math.round((row.borrowedUsd / row.pool.borrowPowerUsd) * 100) : 0
          const hfTone = healthFactorToneClass(row.healthFactor)
          return (
            <li key={row.pool.id} className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                <SpokeDot spoke={spoke} />
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[12px]">
                <MobileField label="Collateral" value={formatCompactUsd(row.pool.collateralUsd)} />
                <MobileField label="Max Borrow" value={formatCompactUsd(row.pool.borrowPowerUsd)} />
                <MobileField label="Borrowed" value={`${formatCompactUsd(row.borrowedUsd)} · ${borrowPct}%`} />
                <MobileField label="HF" value={formatHealthFactor(row.healthFactor)} tone={hfTone} />
                <MobileField label="Fees" value={meta?.feesLabel ?? "$0.00"} />
                <MobileField label="LP APR" value={`${row.pool.pairApr.toFixed(1)}%`} tone="text-emerald-600" />
              </div>
              <div className="flex gap-2">
                <PillButton variant="ghost" size="md" className="flex-1" onClick={() => onRemove(row)}>
                  Remove
                </PillButton>
                <PillButton variant="primary" size="md" className="flex-1" onClick={() => onBorrowMore(row)}>
                  Borrow More
                </PillButton>
              </div>
            </li>
          )
        })}
      </ul>
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

export { HOME_COLLATERAL_POOLS }

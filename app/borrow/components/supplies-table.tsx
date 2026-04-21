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
import { HfNumber, PillButton, SpokeDot, StatsStrip, TokenBubble, TokenPairCell } from "./atoms"
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
  onAddCollateral: (context: SupplyRowContext) => void
  onRemove: (context: SupplyRowContext) => void
  showBalance?: boolean
}

const MASK = "••••"

export function SuppliesPanel({ rows, totals, onBorrowMore, onAddCollateral, onRemove, showBalance = true }: SuppliesTableProps) {
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
        You don&apos;t have any supply positions yet. Provide liquidity on the <span className="font-semibold text-slate-800">Pools to Supply</span> tab to unlock borrow power.
      </div>
    )
  }
  return (
    <div>
      <StatsStrip
        items={[
          { label: "Total Collateral", value: m(formatUsdExact(totals.collateral)) },
          { label: "Borrowed", value: m(formatUsdExact(totals.borrowed)) },
          { label: "Available", value: m(formatUsdExact(totals.available)) },
          { label: "Fees Earned", value: m(formatUsdExact(totals.fees)) },
          {
            label: "Avg HF",
            value: m(formatHealthFactor(totals.averageHf)),
            tone: healthFactorToneClass(totals.averageHf),
          },
        ]}
      />

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-sm font-medium text-slate-500">
                <th className="w-10 px-2 py-3">#</th>
                <th className="px-2 py-3">LP Position</th>
                <th className="px-2 py-3 text-right">Collateral</th>
                <th className="px-2 py-3 text-right">Max Borrow</th>
                <th className="px-2 py-3 text-right">Health Factor</th>
                <th className="px-2 py-3 text-right">Fees Earned</th>
                <th className="w-52 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                return (
                  <tr key={row.pool.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="px-2 py-3.5 text-xs text-slate-400 tabular-nums">{index + 1}</td>
                    <td className="px-2 py-3.5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} />
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-slate-900">
                      {m(formatCompactUsd(row.pool.collateralUsd))}
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-sm tabular-nums text-slate-900">
                      {m(formatCompactUsd(row.pool.borrowPowerUsd))}
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-sm tabular-nums text-slate-900">{m(meta?.feesLabel ?? "$0.00")}</div>
                      <div className="font-data text-xs font-semibold tabular-nums text-emerald-600">
                        {row.pool.pairApr.toFixed(1)}% APR
                      </div>
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

      <ul className="space-y-5 md:hidden">
        {rows.map((row) => {
          const spoke = getSpokeById(homePoolSpoke(row.pool.category))
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const hf = row.healthFactor
          const hfLabel = hf === null || Number.isNaN(hf) ? "—" : !Number.isFinite(hf) ? "∞" : hf.toFixed(1)
          const hfTone = hfBarTone(hf)
          const fillPct = hfBarFill(hf)
          const spokeShort = spoke.label.replace(" Spoke", "")
          const spokePillLabel = `${spokeShort} · Uni v3`
          return (
            <li key={row.pool.id} className="space-y-4 rounded-3xl bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="md" />
                    <TokenBubble visual={visuals[1]} size="md" className="-ml-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[16px] font-semibold text-slate-900">{row.pool.name}</div>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        spoke.pillBgClass,
                        spoke.pillTextClass,
                      )}
                    >
                      {spokePillLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data text-[20px] font-semibold tabular-nums text-slate-900">
                    {m(formatUsdExact(row.pool.collateralUsd))}
                  </div>
                  <div className="text-xs text-slate-500">Collateral</div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-slate-100/70 px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Health Factor</span>
                  <span className={cn("font-data text-[28px] font-semibold leading-none tabular-nums", hfTone.text)}>{m(hfLabel)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-slate-200">
                  <div className={cn("h-2 rounded-full", hfTone.fill)} style={{ width: `${fillPct}%` }} />
                  <span
                    className={cn("absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 bg-white", hfTone.border)}
                    style={{ left: `calc(${fillPct}% - 7px)` }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Safe</span>
                  <span>Liquidation</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-sm">
                  <span className="text-slate-600">Liquidation at</span>
                  <span className={cn("font-data font-semibold tabular-nums", hfTone.text)}>
                    {m(formatUsdExact(row.pool.liquidationUsd))} collateral
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-2xl bg-slate-100/70">
                <SupplyStatCell
                  value={m(formatUsdExact(row.borrowedUsd))}
                  label="Borrowed"
                  valueTone="text-rose-500"
                />
                <SupplyStatCell
                  value={m(meta?.feesLabel ?? "$0")}
                  label="Fees Earned"
                  valueTone="text-emerald-600"
                />
                <SupplyStatCell
                  value={`${row.pool.pairApr.toFixed(1)}%`}
                  label="LP APR"
                />
              </div>

              <div className="flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  className="flex-1 rounded-2xl bg-slate-100 px-5 py-3.5 text-center text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-200"
                >
                  Remove LP
                </button>
                <button
                  type="button"
                  onClick={() => onAddCollateral(row)}
                  className="flex-[2] rounded-2xl bg-rose-500 px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(244,63,94,0.55)] transition-colors hover:bg-rose-600"
                >
                  Add Collateral
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SupplyStatCell({ value, label, valueTone }: { value: string; label: string; valueTone?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3">
      <span className={cn("font-data text-[17px] font-semibold tabular-nums text-slate-900", valueTone)}>{value}</span>
      <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</span>
    </div>
  )
}

function hfBarTone(hf: number | null): { text: string; fill: string; border: string } {
  if (hf === null || Number.isNaN(hf)) {
    return { text: "text-slate-400", fill: "bg-slate-300", border: "border-slate-300" }
  }
  if (!Number.isFinite(hf) || hf >= 3) {
    return { text: "text-emerald-600", fill: "bg-emerald-500", border: "border-emerald-500" }
  }
  if (hf >= 1.5) {
    return { text: "text-amber-600", fill: "bg-amber-500", border: "border-amber-500" }
  }
  return { text: "text-rose-600", fill: "bg-rose-500", border: "border-rose-500" }
}

function hfBarFill(hf: number | null): number {
  if (hf === null || Number.isNaN(hf)) return 0
  if (!Number.isFinite(hf)) return 96
  return Math.min(96, Math.max(6, hf * 17))
}

export { HOME_COLLATERAL_POOLS }

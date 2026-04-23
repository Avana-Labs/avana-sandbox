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
import { HfNumber, PillButton, SpokeDot, TokenBubble, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

export type SupplyRowContext = {
  pool: HomeCollateralPool
  borrowedUsd: number
  healthFactor: number | null
  pairApr: number
  feesUsd: number
  feesLabel: string
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
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        You don&apos;t have any supply positions yet. Provide liquidity on the <span className="font-medium text-foreground">Collaterals</span> tab to unlock borrow power.
      </div>
    )
  }
  return (
    <section className="mb-2">
      <div className="mb-3">
        <h3 className="text-[14px] font-medium tracking-tight">My LP Collaterals</h3>
      </div>
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">LP Position</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Collateral</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Max Borrow</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Health Factor</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Fees Earned</th>
                <th className="w-52 pb-2 pt-3 pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                return (
                  <tr key={row.pool.id} className="transition-colors hover:bg-surface-inset/60">
                    <td className="py-2.5 pl-5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                    </td>
                    <td className="py-2.5 text-right font-data text-[13px] tabular-nums text-foreground">
                      {m(formatCompactUsd(row.pool.collateralUsd))}
                    </td>
                    <td className="py-2.5 text-right font-data text-[13px] tabular-nums text-foreground">
                      {m(formatCompactUsd(row.pool.borrowPowerUsd))}
                    </td>
                    <td className="py-2.5 text-right">
                      <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-foreground">{m(row.feesLabel)}</div>
                      <div className="font-data text-[11px] font-medium tabular-nums text-emerald-600">
                        {row.pairApr.toFixed(1)}% APR
                      </div>
                    </td>
                    <td className="py-2.5 pr-5 text-right">
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
            <li key={row.pool.id} className="space-y-3 rounded-radius-md border border-border bg-surface-raised px-4 py-4 shadow-elev-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="md" />
                    <TokenBubble visual={visuals[1]} size="md" className="-ml-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-foreground">{row.pool.name}</div>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center rounded-xs px-1.5 py-0.5 text-[11px] font-medium",
                        spoke.pillBgClass,
                        spoke.pillTextClass,
                      )}
                    >
                      {spokePillLabel}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data text-[17px] font-medium tabular-nums text-foreground">
                    {m(formatUsdExact(row.pool.collateralUsd))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Collateral</div>
                </div>
              </div>

              <div className="space-y-2.5 rounded-radius-sm border border-border bg-surface-inset px-3 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground">Health Factor</span>
                  <span className={cn("font-data text-[22px] font-medium leading-none tabular-nums", hfTone.text)}>{m(hfLabel)}</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-surface-raised">
                  <div className={cn("h-1.5 rounded-full", hfTone.fill)} style={{ width: `${fillPct}%` }} />
                  <span
                    className={cn("absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 bg-surface-raised", hfTone.border)}
                    style={{ left: `calc(${fillPct}% - 6px)` }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Safe</span>
                  <span>Liquidation</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-[12.5px]">
                  <span className="text-muted-foreground">Liquidation at</span>
                  <span className={cn("font-data font-medium tabular-nums", hfTone.text)}>
                    {m(formatUsdExact(row.pool.liquidationUsd))} collateral
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-radius-sm border border-border bg-surface-inset">
                <SupplyStatCell
                  value={m(formatUsdExact(row.borrowedUsd))}
                  label="Borrowed"
                  valueTone="text-rose-500"
                />
                <SupplyStatCell
                  value={m(row.feesLabel)}
                  label="Fees Earned"
                  valueTone="text-emerald-600"
                />
                <SupplyStatCell
                  value={`${row.pairApr.toFixed(1)}%`}
                  label="LP APR"
                />
              </div>

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onRemove(row)}
                  className="flex-1 rounded-radius-sm border border-border bg-surface-raised px-4 py-2.5 text-center text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
                >
                  Remove LP
                </button>
                <button
                  type="button"
                  onClick={() => onAddCollateral(row)}
                  className="flex-[2] rounded-radius-sm bg-accent-primary px-4 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                >
                  Add Collateral
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SupplyStatCell({ value, label, valueTone }: { value: string; label: string; valueTone?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-2.5">
      <span className={cn("font-data text-[14px] font-medium tabular-nums text-foreground", valueTone)}>{value}</span>
      <span className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
    </div>
  )
}

function hfBarTone(hf: number | null): { text: string; fill: string; border: string } {
  if (hf === null || Number.isNaN(hf)) {
    return { text: "text-muted-foreground", fill: "bg-slate-300", border: "border-slate-300" }
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

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
import { HOME_BORROW_TOKENS, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
import { HfNumber, PillButton, SpokeDot, StatsStrip, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

export type DebtRowContext = {
  pool: HomeCollateralPool
  borrowedUsd: number
  healthFactor: number | null
  borrowApr: number
}

type DebtsTableProps = {
  rows: DebtRowContext[]
  totals: {
    totalBorrowed: number
    totalCollateral: number
    averageHf: number | null
    accruedInterest: number
    dailyInterest: number
  }
  onRepay: (context: DebtRowContext) => void
  onManage: (context: DebtRowContext) => void
}

function usdcVisual() {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[0]
}

export function DebtsPanel({ rows, totals, onRepay, onManage }: DebtsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500">
        You don&apos;t have any active borrows. Use an LP position from <span className="font-semibold text-slate-800">My Supplies</span> as collateral to start a loan.
      </div>
    )
  }
  const usdc = usdcVisual()
  return (
    <div>
      <StatsStrip
        items={[
          { label: "Total Borrowed", value: formatUsdExact(totals.totalBorrowed) },
          { label: "LP Collateral", value: formatUsdExact(totals.totalCollateral) },
          {
            label: "Avg HF",
            value: formatHealthFactor(totals.averageHf),
            tone: healthFactorToneClass(totals.averageHf),
          },
          { label: "Accrued Interest", value: formatUsdExact(totals.accruedInterest) },
          { label: "Daily Interest", value: `+${formatUsdExact(totals.dailyInterest)}` },
        ]}
      />

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-medium text-slate-500">
                <th className="w-10 px-2 py-3">#</th>
                <th className="px-2 py-3">Collateral Position</th>
                <th className="px-2 py-3">Spoke</th>
                <th className="px-2 py-3 text-right">Borrowed</th>
                <th className="px-2 py-3 text-right">Health Factor</th>
                <th className="px-2 py-3 text-right">Accrued Interest</th>
                <th className="px-2 py-3 text-right">Liq. Threshold</th>
                <th className="px-2 py-3 text-right">Borrow APR</th>
                <th className="w-48 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const spoke = getSpokeById(homePoolSpoke(row.pool.category))
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                const tokenCount = (row.borrowedUsd).toFixed(0)
                return (
                  <tr key={row.pool.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                    <td className="px-2 py-3.5 text-[12px] text-slate-400 tabular-nums">{index + 1}</td>
                    <td className="px-2 py-3.5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} />
                    </td>
                    <td className="px-2 py-3.5">
                      <SpokeDot spoke={spoke} />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-slate-900">{formatCompactUsd(row.borrowedUsd)}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {tokenCount} {usdc.symbol}
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <HfNumber value={formatHealthFactor(row.healthFactor)} tone={hfTone} />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-slate-900">{formatUsdExact(meta?.accruedInterestUsd ?? 0)}</div>
                      <div className="text-[10.5px] text-slate-400">since {meta?.openedLabel ?? "—"}</div>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-slate-900">{formatUsdExact(row.pool.liquidationUsd)}</div>
                      <div className="text-[10.5px] text-slate-400">collateral value</div>
                    </td>
                    <td className="px-2 py-3.5 text-right font-data text-[13px] font-semibold tabular-nums text-rose-600">
                      {row.borrowApr.toFixed(1)}%
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <PillButton variant="ghost" onClick={() => onManage(row)}>
                          Manage
                        </PillButton>
                        <PillButton variant="success" onClick={() => onRepay(row)}>
                          Repay
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
          const hfTone = healthFactorToneClass(row.healthFactor)
          return (
            <li key={row.pool.id} className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                <SpokeDot spoke={spoke} />
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[12px]">
                <MobileField label="Borrowed" value={formatCompactUsd(row.borrowedUsd)} />
                <MobileField label="HF" value={formatHealthFactor(row.healthFactor)} tone={hfTone} />
                <MobileField label="Accrued" value={formatUsdExact(meta?.accruedInterestUsd ?? 0)} />
                <MobileField label="Liq. Threshold" value={formatUsdExact(row.pool.liquidationUsd)} />
                <MobileField label="Borrow APR" value={`${row.borrowApr.toFixed(1)}%`} tone="text-rose-600" />
              </div>
              <div className="flex gap-2">
                <PillButton variant="ghost" size="md" className="flex-1" onClick={() => onManage(row)}>
                  Manage
                </PillButton>
                <PillButton variant="success" size="md" className="flex-1" onClick={() => onRepay(row)}>
                  Repay
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

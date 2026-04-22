"use client"

import {
  BORROW_SUPPLY_META,
  aprToneClass,
  formatCompactUsd,
  formatUsdExact,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HOME_BORROW_TOKENS, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
import { HfNumber, PillButton, TokenBubble, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

export type DebtRowContext = {
  pool: HomeCollateralPool
  borrowedUsd: number
  healthFactor: number | null
  borrowApr: number
  accruedInterestUsd: number
  dailyInterestUsd: number
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
  showBalance?: boolean
}

const MASK = "••••"

function usdcVisual() {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[0]
}

export function DebtsPanel({ rows, totals, onRepay, onManage, showBalance = true }: DebtsTableProps) {
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        You don&apos;t have any active borrows. Use an LP position from <span className="font-semibold text-foreground">My Supplies</span> as collateral to start a loan.
      </div>
    )
  }
  const usdc = usdcVisual()
  return (
    <div>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground">
                <th className="px-2 py-3">Collateral Position</th>
                <th className="px-2 py-3 text-right">Borrowed</th>
                <th className="px-2 py-3 text-right">Health Factor</th>
                <th className="px-2 py-3 text-right">Accrued Interest</th>
                <th className="px-2 py-3 text-right">Liq. Threshold</th>
                <th className="w-48 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                const tokenCount = (row.borrowedUsd).toFixed(0)
                return (
                  <tr key={row.pool.id} className="border-t border-border transition-colors hover:bg-surface-hover">
                    <td className="px-2 py-3.5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="lg" />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-sm tabular-nums text-foreground">{m(formatCompactUsd(row.borrowedUsd))}</div>
                      <div className="text-xs text-muted-foreground">
                        {showBalance ? `${tokenCount} ${usdc.symbol}` : MASK}
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-sm tabular-nums text-foreground">{m(formatUsdExact(row.accruedInterestUsd))}</div>
                      <div className={cn("font-data text-xs font-semibold tabular-nums", aprToneClass(row.borrowApr))}>
                        {row.borrowApr.toFixed(1)}% APR
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      <div className="font-data text-sm tabular-nums text-foreground">{m(formatUsdExact(row.pool.liquidationUsd))}</div>
                      <div className="text-xs text-muted-foreground">collateral value</div>
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

      <ul className="space-y-5 md:hidden">
        {rows.map((row) => {
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const pairLabel = `${row.pool.visuals[0].symbol} / ${row.pool.visuals[1].symbol} LP`
          return (
            <li key={row.pool.id} className="space-y-4 rounded-3xl bg-card px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">Active debt</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-data text-[40px] font-semibold leading-none tracking-tight text-rose-500">
                    {m(formatUsdExact(row.borrowedUsd))}
                  </span>
                  <span className="text-[18px] font-medium text-muted-foreground">{usdc.symbol}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/80 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Backed by</span>
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="sm" />
                    <TokenBubble visual={visuals[1]} size="sm" className="-ml-1.5" />
                  </div>
                </div>
                <div className="text-right font-data text-sm font-semibold tabular-nums text-foreground">
                  {pairLabel} · {m(formatUsdExact(row.pool.collateralUsd))}
                </div>
              </div>

              <dl className="divide-y divide-border text-sm">
                <DebtStatLine
                  label="Borrow APR"
                  value={`${row.borrowApr.toFixed(2)}%`}
                  tone={aprToneClass(row.borrowApr)}
                />
                <DebtStatLine
                  label="Accrued Interest"
                  value={showBalance ? `+${formatUsdExact(row.accruedInterestUsd)}` : MASK}
                  tone="text-rose-500"
                />
                <DebtStatLine
                  label="Daily Interest"
                  value={showBalance ? `+${formatUsdExact(row.dailyInterestUsd)}/day` : MASK}
                  tone="text-rose-500"
                />
                <DebtStatLine label="Opened" value={meta?.openedLabel ?? "—"} />
              </dl>

              <div className="flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => onRepay(row)}
                  className="flex-[2] rounded-2xl bg-rose-500 px-5 py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(244,63,94,0.55)] transition-colors hover:bg-rose-600"
                >
                  Repay Loan
                </button>
                <button
                  type="button"
                  onClick={() => onManage(row)}
                  className="flex-1 rounded-2xl bg-muted px-5 py-3.5 text-center text-[15px] font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Manage
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DebtStatLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-semibold tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}

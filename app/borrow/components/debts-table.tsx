"use client"

import { Info } from "lucide-react"
import {
  BORROW_SUPPLY_META,
  aprToneClass,
  formatCompactUsd,
  formatUsdExact,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HOME_BORROW_TOKENS, LIQUIDATION_LTV, MAX_LTV, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
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
const TICK_COUNT = 28

function usdcVisual() {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[0]
}

export function DebtsPanel({ rows, totals, onRepay, onManage, showBalance = true }: DebtsTableProps) {
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        You don&apos;t have any active borrows. Use an LP position from <span className="font-medium text-foreground">Positions</span> as collateral to start a loan.
      </div>
    )
  }
  const usdc = usdcVisual()
  return (
    <section className="mb-2">
      <CurrentLtvCard borrowedUsd={totals.totalBorrowed} collateralUsd={totals.totalCollateral} showBalance={showBalance} />
      <div className="mb-3">
        <h3 className="text-[14px] font-medium tracking-tight">My Borrows</h3>
      </div>
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pt-3 pl-5 text-[10.5px] font-medium uppercase tracking-[0.06em]">Collateral Position</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Borrowed</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Health Factor</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Accrued Interest</th>
                <th className="pb-2 pt-3 text-right text-[10.5px] font-medium uppercase tracking-[0.06em]">Liq. Threshold</th>
                <th className="w-48 pb-2 pt-3 pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
                const meta = BORROW_SUPPLY_META[row.pool.id]
                const hfTone = healthFactorToneClass(row.healthFactor)
                const tokenCount = (row.borrowedUsd).toFixed(0)
                return (
                  <tr key={row.pool.id} className="transition-colors hover:bg-surface-inset/60">
                    <td className="py-2.5 pl-5">
                      <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatCompactUsd(row.borrowedUsd))}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {showBalance ? `${tokenCount} ${usdc.symbol}` : MASK}
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatUsdExact(row.accruedInterestUsd))}</div>
                      <div className={cn("font-data text-[11px] font-medium tabular-nums", aprToneClass(row.borrowApr))}>
                        {row.borrowApr.toFixed(1)}% APR
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatUsdExact(row.pool.liquidationUsd))}</div>
                      <div className="text-[11px] text-muted-foreground">collateral value</div>
                    </td>
                    <td className="py-2.5 pr-5 text-right">
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
      </div>

      <ul className="space-y-5 md:hidden">
        {rows.map((row) => {
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const pairLabel = `${row.pool.visuals[0].symbol} / ${row.pool.visuals[1].symbol} LP`
          return (
            <li key={row.pool.id} className="space-y-3 rounded-radius-md border border-border bg-surface-raised px-4 py-4 shadow-elev-1">
              <div>
                <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Active debt</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-data text-[28px] font-medium leading-none tracking-tight text-rose-500">
                    {m(formatUsdExact(row.borrowedUsd))}
                  </span>
                  <span className="text-[14px] font-medium text-muted-foreground">{usdc.symbol}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-radius-sm border border-border bg-surface-inset px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Backed by</span>
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="sm" />
                    <TokenBubble visual={visuals[1]} size="sm" className="-ml-1.5" />
                  </div>
                </div>
                <div className="text-right font-data text-[12.5px] font-medium tabular-nums text-foreground">
                  {pairLabel} · {m(formatUsdExact(row.pool.collateralUsd))}
                </div>
              </div>

              <dl className="divide-y divide-border text-[12.5px]">
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

              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => onRepay(row)}
                  className="flex-[2] rounded-radius-sm bg-accent-primary px-4 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
                >
                  Repay Loan
                </button>
                <button
                  type="button"
                  onClick={() => onManage(row)}
                  className="flex-1 rounded-radius-sm border border-border bg-surface-raised px-4 py-2.5 text-center text-[13px] font-medium text-foreground transition-colors hover:bg-surface-inset"
                >
                  Manage
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DebtStatLine({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}

function CurrentLtvCard({
  borrowedUsd,
  collateralUsd,
  showBalance,
}: {
  borrowedUsd: number
  collateralUsd: number
  showBalance: boolean
}) {
  const ltv = collateralUsd > 0 ? Math.min(1, borrowedUsd / collateralUsd) : 0
  const ltvPct = ltv * 100
  const liquidationPct = LIQUIDATION_LTV * 100
  const ltvLabel = `${ltvPct.toFixed(2)}%`
  const masked = !showBalance
  const maxUsd = collateralUsd * MAX_LTV
  const usedLabel = masked ? "••" : formatCompactUsd(borrowedUsd)
  const maxLabel = masked ? "••" : formatCompactUsd(maxUsd)
  const usedTicks = Math.max(1, Math.round((ltvPct / 100) * TICK_COUNT))
  const tone = "bg-emerald-500"

  return (
    <div className="mb-4 rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-[13px] font-semibold text-foreground">Current LTV</span>
        <Info className="h-3.5 w-3.5 self-center text-muted-foreground" aria-hidden />
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">{masked ? "••" : ltvLabel}</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">borrow power used</span>
      </div>

      <div className="relative mt-9">
        <div
          className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 pb-1 text-center"
          style={{ left: `${ltvPct}%` }}
        >
          <div className="rounded-md bg-foreground px-1.5 py-0.5 font-data text-[11px] font-bold text-background">
            {masked ? "••" : ltvLabel}
          </div>
          <div className="-mt-px text-[10px] leading-none text-foreground">▼</div>
        </div>

        <div className="flex h-8 w-full items-end gap-[3px]">
          {Array.from({ length: TICK_COUNT }).map((_, index) => {
            const cls = index < usedTicks ? tone : "bg-muted"
            const isCurrent = index === Math.max(0, usedTicks - 1)
            return (
              <span
                key={index}
                className={cn(
                  "flex-1 rounded-[2px] transition-all",
                  isCurrent ? "h-full ring-2 ring-foreground ring-offset-1 ring-offset-surface-inset" : "h-[75%]",
                  cls,
                )}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>
          Used <span className="font-semibold text-foreground">{usedLabel}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span>
            Max <span className="font-semibold text-foreground">{maxLabel}</span>
          </span>
          <span className="text-rose-500">{liquidationPct.toFixed(0)}% liq</span>
        </span>
      </div>
    </div>
  )
}

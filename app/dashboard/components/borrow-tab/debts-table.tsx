"use client"

import { Info } from "lucide-react"
import {
  BORROW_SUPPLY_META,
  HOME_BORROW_TOKENS,
  LIQUIDATION_LTV,
  aprToneClass,
  formatHealthFactor,
  formatCompactUsd,
  formatUsdExact,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import type { DebtRowContext } from "@/app/lib/data/borrow-position-types"
import { HfNumber, PillButton, TokenBubble, TokenPairCell } from "@/app/borrow/components/atoms"
import { cn } from "@/lib/utils"

const ROW_HOVER_BG = "transition-colors group-hover:bg-slate-50 dark:group-hover:bg-[#131820]"
const ROW_HOVER_LEFT = `${ROW_HOVER_BG} group-hover:rounded-l-2xl`
const ROW_HOVER_RIGHT = `${ROW_HOVER_BG} group-hover:rounded-r-2xl`

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
  showSummary?: boolean
  showHeading?: boolean
}

const MASK = "••••"
const TICK_COUNT = 28

function usdcVisual() {
  return HOME_BORROW_TOKENS.find((token) => token.id === "usdc") ?? HOME_BORROW_TOKENS[0]
}

export function DebtsPanel({
  rows,
  totals,
  onRepay,
  onManage,
  showBalance = true,
  showSummary = true,
  showHeading = true,
}: DebtsTableProps) {
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        <div className="text-[20px] font-medium leading-snug tracking-tight text-[#01AACF]">
          Nothing borrowed yet
        </div>
        <div className="mt-1 text-[15px] leading-snug">To borrow you need to supply any LPs to be used as collateral</div>
      </div>
    )
  }
  const usdc = usdcVisual()
  return (
    <section className="mb-2">
      {showSummary ? (
        <CurrentLtvCard borrowedUsd={totals.totalBorrowed} collateralUsd={totals.totalCollateral} showBalance={showBalance} />
      ) : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[14px] font-medium tracking-tight">My Borrows</h3>
        </div>
      ) : null}
      <div className="hidden md:block">
        <div className="rounded-[18px] bg-transparent">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[28%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="rounded-l-2xl bg-slate-50 px-4 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    #
                  </th>
                  <th className="bg-slate-50 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    Collateral Position
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    Borrowed
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    Health Factor
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    Accrued Interest
                  </th>
                  <th className="bg-slate-50 px-4 py-3.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58">
                    Liq. Threshold
                  </th>
                  <th className="rounded-r-2xl bg-slate-50 px-4 py-3.5 pr-5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:bg-[#131820] dark:text-white/58" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [
                    ReturnType<typeof homeVisualToBorrowVisual>,
                    ReturnType<typeof homeVisualToBorrowVisual>,
                  ]
                  const meta = BORROW_SUPPLY_META[row.pool.id]
                  const hfTone = healthFactorToneClass(row.healthFactor)
                  const tokenCount = row.borrowedUsd.toFixed(0)
                  const rowKey = row.id ?? `${row.pool.id}-${index}`
                  return (
                    <tr key={rowKey} className="group transition-colors">
                      <td className={`py-3 pl-4 pr-3 align-middle font-data text-[14px] font-medium tabular-nums text-muted-foreground dark:text-white/52 ${ROW_HOVER_LEFT}`}>
                        {index + 1}
                      </td>
                      <td className={`py-3 pl-5 ${ROW_HOVER_BG}`}>
                        <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                      </td>
                      <td className={`py-3 pl-4 text-left ${ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatCompactUsd(row.borrowedUsd))}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {showBalance ? `${tokenCount} ${usdc.symbol}` : MASK}
                        </div>
                      </td>
                      <td className={`py-3 pl-4 text-left ${ROW_HOVER_BG}`}>
                        <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                      </td>
                      <td className={`py-3 pl-4 text-left ${ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatUsdExact(row.accruedInterestUsd))}</div>
                        <div className={cn("font-data text-[11px] font-medium tabular-nums", aprToneClass(row.borrowApr))}>
                          {row.borrowApr.toFixed(1)}% APR
                        </div>
                      </td>
                      <td className={`py-3 pl-4 text-left ${ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">{m(formatUsdExact(row.liquidationThresholdUsd))}</div>
                        <div className="text-[11px] text-muted-foreground">collateral value</div>
                      </td>
                      <td className={`py-3 pl-4 pr-5 text-left ${ROW_HOVER_RIGHT}`}>
                        <div className="flex justify-start gap-1.5">
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
        {rows.map((row, index) => {
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const pairLabel = `${row.pool.visuals[0].symbol} / ${row.pool.visuals[1].symbol} LP`
          const rowKey = row.id ?? `${row.pool.id}-${index}`
          return (
            <li key={rowKey} className="space-y-3 rounded-radius-md border border-border bg-surface-raised px-4 py-4 shadow-elev-1">
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

export function CurrentLtvCard({
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
  const masked = !showBalance
  const liquidationValueUsd = collateralUsd * LIQUIDATION_LTV
  const remainingBorrowingPowerUsd = Math.max(0, liquidationValueUsd - borrowedUsd)
  const borrowingPowerLabel = masked ? "••" : formatCompactUsd(remainingBorrowingPowerUsd)
  const usedLabel = masked ? "••" : formatCompactUsd(borrowedUsd)
  const maxLabel = masked ? "••" : formatCompactUsd(liquidationValueUsd)
  const usedTicks = Math.max(1, Math.round((ltvPct / 100) * TICK_COUNT))
  const tone = "bg-emerald-500"
  const statusLabel = remainingBorrowingPowerUsd > 0 ? "GOOD" : "RISK"

  return (
    <div className="mb-4 rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-[13px] font-semibold text-foreground">Borrowing Power</span>
          <Info className="h-3.5 w-3.5 self-center text-muted-foreground" aria-hidden />
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">{borrowingPowerLabel}</span>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-600">
          {statusLabel}
        </span>
      </div>

      <div className="relative mt-9">
        <div
          className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 pb-1 text-center"
          style={{ left: `${ltvPct}%` }}
        >
          <div className="rounded-md bg-foreground px-1.5 py-0.5 font-data text-[11px] font-bold text-background">
            {masked ? "••" : `${ltvPct.toFixed(2)}%`}
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
            Liq. max <span className="font-semibold text-foreground">{maxLabel}</span>
          </span>
          <span className="text-rose-500">{liquidationPct.toFixed(0)}% liq</span>
        </span>
      </div>
    </div>
  )
}

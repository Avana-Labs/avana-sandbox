"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  BORROW_SUPPLY_META,
  LIQUIDATION_LTV,
  aprToneClass,
  formatHealthFactor,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import type { DebtRowContext } from "@/app/lib/data/borrow-position-types"
import { HfNumber, TokenBubble, TokenPairCell } from "@/app/borrow/components/atoms"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import { cn } from "@/lib/utils"

import { TABLE_ROW_HOVER_BG, TABLE_ROW_HOVER_LEFT, TABLE_ROW_HOVER_RIGHT } from "@/app/lib/ui/table-row-hover"

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

export function DebtsPanel({
  rows,
  totals,
  onRepay,
  onManage,
  showBalance = true,
  showSummary = true,
  showHeading = true,
}: DebtsTableProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { compact, exact } = useCurrency()
  const m = (value: string) => (showBalance ? value : MASK)
  if (rows.length === 0) {
    return (
      <div className="rounded-radius-md border border-dashed border-border bg-surface-raised/50 px-6 py-10 text-center text-[13px] text-muted-foreground">
        <div className="text-[20px] font-medium leading-snug tracking-tight text-brand">
          {t("Nothing borrowed yet")}
        </div>
        <div className="mt-1 text-[15px] leading-snug">{t("To borrow you need to supply any LPs to be used as collateral")}</div>
      </div>
    )
  }
  return (
    <section className="mb-2">
      {showSummary ? (
        <CurrentLtvCard borrowedUsd={totals.totalBorrowed} collateralUsd={totals.totalCollateral} showBalance={showBalance} />
      ) : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[14px] font-medium tracking-tight">{t("My Borrows")}</h3>
        </div>
      ) : null}
      <div className="hidden md:block">
        <DesktopTableSurface className="rounded-radius-md">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[32%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="rounded-l-radius-lg bg-table-header px-5 py-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Collateral Position")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Borrowed")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Health Factor")}
                  </th>
                  <th className="bg-table-header px-4 py-3.5 text-right text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("Liq. Threshold")}
                  </th>
                  <th className="rounded-r-radius-lg bg-table-header px-4 py-3.5 pr-5 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [
                    ReturnType<typeof homeVisualToBorrowVisual>,
                    ReturnType<typeof homeVisualToBorrowVisual>,
                  ]
                  const meta = BORROW_SUPPLY_META[row.pool.id]
                  const hfTone = healthFactorToneClass(row.healthFactor)
                  const detailHref = `/borrow/markets/${row.pool.id}`
                  const debtSymbol = row.debtAssetSymbol
                  return (
                    <tr
                      key={row.id ?? row.pool.id}
                      className="group cursor-pointer transition-colors"
                      onClick={() => router.push(detailHref)}
                    >
                      <td className={`py-3 pl-5 ${TABLE_ROW_HOVER_LEFT}`}>
                        <TokenPairCell visuals={visuals} name={row.pool.name} subtitle={meta?.venue ?? row.pool.venue} size="md" />
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">{m(compact(row.borrowedUsd))}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {showBalance ? `${row.borrowedUsd.toFixed(0)} ${debtSymbol}` : MASK}
                        </div>
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">{m(exact(row.liquidationThresholdUsd))}</div>
                        <div className="text-[11px] text-muted-foreground">{t("collateral value")}</div>
                      </td>
                      <td className={`py-3 pl-4 pr-5 text-left ${TABLE_ROW_HOVER_RIGHT}`}>
                        <HoverActionGroup align="start" className="gap-2">
                          <Button
                            type="button"
                            size="table"
                            variant="brand-secondary"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              onRepay(row)
                            }}
                          >
                            {t("Repay")}
                          </Button>
                          <Button
                            type="button"
                            size="table"
                            variant="brand"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              onManage(row)
                            }}
                          >
                            {t("Borrow")}
                          </Button>
                        </HoverActionGroup>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </DesktopTableSurface>
      </div>

      <ul className="space-y-5 md:hidden">
        {rows.map((row, index) => {
          const visuals = row.pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
          const meta = BORROW_SUPPLY_META[row.pool.id]
          const pairLabel = `${row.pool.visuals[0].symbol} / ${row.pool.visuals[1].symbol} LP`
          const rowKey = row.id ?? `${row.pool.id}-${index}`
          return (
            <li key={rowKey} className="space-y-3 rounded-radius-md border border-border bg-card px-4 py-4 shadow-elev-1">
              <div>
                <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{t("Active debt")}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-data text-[28px] font-medium leading-none tracking-tight text-rose-500">
                    {m(exact(row.borrowedUsd))}
                  </span>
                  <span className="text-[14px] font-medium text-muted-foreground">{row.debtAssetSymbol}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-radius-sm border border-border bg-surface-inset px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">{t("Backed by")}</span>
                  <div className="flex items-center">
                    <TokenBubble visual={visuals[0]} size="table" />
                    <TokenBubble visual={visuals[1]} size="table" className="-ml-1.5" />
                  </div>
                </div>
                <div className="text-right font-data text-[12.5px] font-medium tabular-nums text-foreground">
                  {pairLabel} · {m(exact(row.pool.collateralUsd))}
                </div>
              </div>

              <dl className="divide-y divide-border text-[12.5px]">
                <DebtStatLine
                  label={t("Borrow APR")}
                  value={`${row.borrowApr.toFixed(2)}%`}
                  tone={aprToneClass(row.borrowApr)}
                />
                <DebtStatLine
                  label={t("Daily Interest")}
                  value={showBalance ? `+${exact(row.dailyInterestUsd)}/${t("day")}` : MASK}
                  tone="text-rose-500"
                />
                <DebtStatLine label={t("Opened")} value={meta?.openedLabel ?? "—"} />
              </dl>

              <div className="flex items-stretch gap-2">
                <Button
                  type="button"
                  variant="brand-secondary"
                  className="h-10 flex-1 rounded-radius-sm px-4 text-[13px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepay(row)
                  }}
                >
                  {t("Repay")}
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  className="h-10 flex-[2] rounded-radius-sm px-4 text-[13px]"
                  onClick={(event) => {
                    event.stopPropagation()
                    onManage(row)
                  }}
                >
                  {t("Borrow")}
                </Button>
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
  const { t } = useTranslation()
  const { compact } = useCurrency()
  const masked = !showBalance
  const liquidationValueUsd = collateralUsd * LIQUIDATION_LTV
  const remainingBorrowingPowerUsd = Math.max(0, liquidationValueUsd - borrowedUsd)
  const liqUtilizationPct = liquidationValueUsd > 0 ? Math.min(100, (borrowedUsd / liquidationValueUsd) * 100) : 0
  const barFillPct = liquidationValueUsd > 0 ? liqUtilizationPct : 0
  const borrowingPowerLabel = masked ? "••" : compact(remainingBorrowingPowerUsd)
  const usedLabel = masked ? "••" : compact(borrowedUsd)
  const maxLabel = masked ? "••" : compact(liquidationValueUsd)
  const usedTicks = Math.max(1, Math.round((barFillPct / 100) * TICK_COUNT))
  const tone = "bg-emerald-500"
  const statusLabel = remainingBorrowingPowerUsd > 0 ? t("GOOD") : t("RISK")

  return (
    <div className="mb-4 rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">{borrowingPowerLabel}</span>
          <span className="text-[13px] font-semibold text-foreground">{t("Borrowing Power")}</span>
          <ActionMetricHelp
            topic="Borrowing Power"
            text={t("Remaining room to borrow before your position approaches liquidation, based on current collateral and outstanding debt.")}
          />
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-success">
          {statusLabel}
        </span>
      </div>

      <div className="relative mt-9">
        <div
          className="pointer-events-none absolute bottom-full z-10 -translate-x-1/2 pb-1 text-center"
          style={{ left: `${barFillPct}%` }}
        >
          <div className="rounded-md bg-foreground px-1.5 py-0.5 font-data text-[11px] font-bold text-background">
            {masked ? "••" : `${liqUtilizationPct.toFixed(1)}%`}
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
                  "flex-1 rounded-xs transition-all",
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
          {t("Used")} <span className="font-semibold text-foreground">{usedLabel}</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span>
            {t("Liq. max")} <span className="font-semibold text-foreground">{maxLabel}</span>
          </span>
          <span className="text-rose-500">{masked ? "••" : t("{percent}% of liq. max").replace("{percent}", liqUtilizationPct.toFixed(0))}</span>
        </span>
      </div>
    </div>
  )
}

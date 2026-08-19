"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { ActionIcon } from "@/app/components/action-icon"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { LIQUIDATION_LTV, aprToneClass, formatHealthFactor, healthFactorToneClass } from "@/app/lib/data/borrow-domain"
import type { DebtRowContext } from "@/app/lib/data/borrow-position-types"
import { HfNumber } from "@/app/borrow/components/atoms"
import { TokenIcon } from "@/app/components/token-icon"
import {
  MarketMobileCard,
  MarketMobileCardHeader,
  MarketMobileMetric,
  MarketMobilePrimaryAction,
  MarketMobileSecondaryAction,
  MarketMobileStatList,
  MarketMobileStatRow,
} from "@/app/components/market-card-primitives"
import { DesktopTableSurface, HoverActionGroup } from "@/app/components/market-table-primitives"
import { liqUtilizationBarClass, liqUtilizationPercentTextClass } from "@/app/lib/borrow-system/liq-utilization-tone"
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
        <div className="mt-1 text-[15px] leading-snug">
          {t("To borrow you need to supply any LPs to be used as collateral")}
        </div>
      </div>
    )
  }
  return (
    <section className="mb-2">
      {showSummary ? (
        <CurrentLtvCard
          borrowedUsd={totals.totalBorrowed}
          collateralUsd={totals.totalCollateral}
          showBalance={showBalance}
          dailyInterestUsd={totals.dailyInterest}
          accruedInterestUsd={totals.accruedInterest}
        />
      ) : null}
      {showHeading ? (
        <div className="mb-3">
          <h3 className="text-[18px] font-medium tracking-tight text-foreground md:text-[20px]">{t("My Debts")}</h3>
        </div>
      ) : null}
      <div className="hidden md:block">
        <DesktopTableSurface className="!rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[19%]" />
              </colgroup>
              <thead>
                <tr className="text-left text-[11.5px] font-medium text-muted-foreground">
                  <th className="bg-table-header px-5 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Debt")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Borrowed")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Interest / day")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Health")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                    {t("Liq.")}
                  </th>
                  <th className="bg-table-header px-4 pb-2 pt-2.5 pr-5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
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
                        {/* Debt is a single borrowed token, not the collateral LP pool — show the
                            borrowed asset, with the collateral market as context. */}
                        <div className="flex min-w-0 items-center gap-2.5">
                          <TokenIcon symbol={debtSymbol} size="table" />
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground dark:text-white">
                              {debtSymbol}
                            </div>
                            <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
                              {t("against {pool}").replace("{pool}", row.pool.name)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">
                          {m(compact(row.borrowedUsd))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {showBalance ? `${row.borrowedUsd.toFixed(0)} ${debtSymbol}` : MASK}
                        </div>
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-rose-500">
                          {showBalance ? `+${exact(row.dailyInterestUsd)}` : MASK}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t("per day")}</div>
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <HfNumber value={m(formatHealthFactor(row.healthFactor))} tone={hfTone} />
                      </td>
                      <td className={`py-3 pl-4 text-right ${TABLE_ROW_HOVER_BG}`}>
                        <div className="font-data text-[13px] tabular-nums text-foreground">
                          {m(exact(row.liquidationThresholdUsd))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{t("liquidation value")}</div>
                      </td>
                      <td className={`py-3 pl-4 pr-5 text-left ${TABLE_ROW_HOVER_RIGHT}`}>
                        <HoverActionGroup align="start" className="gap-2">
                          <Button
                            type="button"
                            size="table"
                            variant="table-primary"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              onRepay(row)
                            }}
                          >
                            <ActionIcon label="Repay" />
                            {t("Repay")}
                          </Button>
                          <Button
                            type="button"
                            size="table"
                            variant="table-secondary"
                            className="w-auto"
                            onClick={(event) => {
                              event.stopPropagation()
                              onManage(row)
                            }}
                          >
                            <ActionIcon label="Borrow" />
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
          const rowKey = row.id ?? `${row.pool.id}-${index}`
          return (
            <MarketMobileCard key={rowKey} clickable onClick={() => router.push(`/borrow/markets/${row.pool.id}`)}>
              <MarketMobileCardHeader
                identity={
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TokenIcon symbol={row.debtAssetSymbol} size="table" />
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-medium tracking-[-0.03em] text-foreground">
                        {row.debtAssetSymbol}
                      </div>
                      <div className="truncate text-[13px] text-muted-foreground">
                        {t("against {pool}").replace("{pool}", row.pool.name)}
                      </div>
                    </div>
                  </div>
                }
                metric={
                  <MarketMobileMetric
                    value={m(compact(row.borrowedUsd))}
                    label={t("Borrowed")}
                    valueClassName="text-rose-500"
                  />
                }
              />
              <MarketMobileStatList className="mt-3">
                <MarketMobileStatRow
                  label={t("Health")}
                  value={m(formatHealthFactor(row.healthFactor))}
                  valueClassName={healthFactorToneClass(row.healthFactor)}
                />
                <MarketMobileStatRow
                  label={t("Borrow APR")}
                  value={`${row.borrowApr.toFixed(2)}%`}
                  valueClassName={aprToneClass(row.borrowApr)}
                />
                <MarketMobileStatRow
                  label={t("Daily Interest")}
                  value={showBalance ? `+${exact(row.dailyInterestUsd)}/${t("day")}` : MASK}
                  valueClassName="text-rose-500"
                />
              </MarketMobileStatList>
              <div className="mt-4 flex gap-2">
                <MarketMobileSecondaryAction
                  onClick={(event) => {
                    event.stopPropagation()
                    onRepay(row)
                  }}
                >
                  <ActionIcon label="Repay" />
                  {t("Repay")}
                </MarketMobileSecondaryAction>
                <MarketMobilePrimaryAction
                  className="mt-0 flex-1"
                  onClick={(event) => {
                    event.stopPropagation()
                    onManage(row)
                  }}
                >
                  <ActionIcon label="Borrow" />
                  {t("Borrow")}
                </MarketMobilePrimaryAction>
              </div>
            </MarketMobileCard>
          )
        })}
      </ul>
    </section>
  )
}

export function CurrentLtvCard({
  borrowedUsd,
  collateralUsd,
  showBalance,
  dailyInterestUsd,
  accruedInterestUsd,
}: {
  borrowedUsd: number
  collateralUsd: number
  showBalance: boolean
  // Borrowing cost. Optional so callers that only have the LTV inputs (multiply
  // health card) render the card unchanged; the borrow tab passes both.
  dailyInterestUsd?: number
  accruedInterestUsd?: number
}) {
  const { t } = useTranslation()
  const { compact, exact } = useCurrency()
  const masked = !showBalance
  // With no collateral AND no debt there is no position to assess. Treat this as
  // a neutral/empty state rather than letting the "0 borrowing power" branch read
  // as RISK for a wallet that simply hasn't opened anything.
  const hasPosition = collateralUsd > 0 || borrowedUsd > 0
  const liquidationValueUsd = collateralUsd * LIQUIDATION_LTV
  const remainingBorrowingPowerUsd = Math.max(0, liquidationValueUsd - borrowedUsd)
  const liqUtilizationPct = liquidationValueUsd > 0 ? Math.min(100, (borrowedUsd / liquidationValueUsd) * 100) : 0
  const barFillPct = liquidationValueUsd > 0 ? liqUtilizationPct : 0
  const borrowingPowerLabel = masked ? "••" : compact(remainingBorrowingPowerUsd)
  const usedLabel = masked ? "••" : compact(borrowedUsd)
  const maxLabel = masked ? "••" : compact(liquidationValueUsd)
  const usedTicks = Math.max(1, Math.round((barFillPct / 100) * TICK_COUNT))
  const tone = liqUtilizationBarClass(liqUtilizationPct)
  const liqPercentTone = liqUtilizationPercentTextClass(liqUtilizationPct)
  const statusLabel = !hasPosition ? t("NONE") : remainingBorrowingPowerUsd > 0 ? t("GOOD") : t("RISK")
  const statusToneClass = hasPosition ? "bg-emerald-500/10 text-success" : "bg-muted text-muted-foreground"

  return (
    <div className="mb-4 rounded-radius-md border border-border bg-card px-5 py-4 shadow-elev-1 md:px-6 md:py-5">
      <div className="flex h-6 items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-data text-[20px] font-bold leading-none tracking-tight text-foreground">
            {borrowingPowerLabel}
          </span>
          <span className="text-[13px] font-semibold text-foreground">{t("Borrowing Power")}</span>
          <ActionMetricHelp
            topic="Borrowing Power"
            text={t(
              "Remaining room to borrow before your position approaches liquidation, based on current collateral and outstanding debt.",
            )}
          />
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${statusToneClass}`}
        >
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
          <span className={liqPercentTone}>
            {masked ? "••" : t("{percent}% of liq. max").replace("{percent}", liqUtilizationPct.toFixed(0))}
          </span>
        </span>
      </div>

      {dailyInterestUsd != null || accruedInterestUsd != null ? (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[11px] font-medium text-muted-foreground">
          <span>
            {t("Interest / day")}{" "}
            <span className="font-semibold text-rose-500">{masked ? "••" : exact(dailyInterestUsd ?? 0)}</span>
          </span>
          <span>
            {t("Accrued interest")}{" "}
            <span className="font-semibold text-foreground">{masked ? "••" : exact(accruedInterestUsd ?? 0)}</span>
          </span>
        </div>
      ) : null}
    </div>
  )
}

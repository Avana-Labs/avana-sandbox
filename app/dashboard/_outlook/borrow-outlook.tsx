"use client"

/**
 * Borrow → "Borrow Outlook". Forward-looking risk companion for the Borrow tab:
 * a projected interest-cost card, a per-collateral liquidation table (liq price +
 * drop buffer, each holding other assets equal), and a what-if simulator that
 * reprices HF and the liquidation buffer live (simulated values in accent).
 *
 * UI-only phase — fed by MOCK_BORROW_OUTLOOK. HF/liq-price are derived here from
 * collateral + debt so the tables and simulator stay internally consistent; the
 * later wiring pass swaps the mock for riskSnapshots + pool liq thresholds.
 */

import { useMemo, useState } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { TokenIcon } from "@/app/components/token-icon"
import { formatUsdExact, formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatHealthFactor } from "@/app/lib/data/borrow-domain"
import { healthFactorBand } from "@/app/lib/health/health-factor-bands"
import { MOCK_BORROW_OUTLOOK, type BorrowCollateralOutlook } from "./mock-data"
import { OutlookSection, OutlookCard, OutlookDisclaimer } from "./outlook-shell"
import { projectedEarnings } from "./forecast-core"

const MASK = "••••"

/** Sum of collateral value × liquidation threshold (the numerator of HF). */
function liquidationValue(collateral: BorrowCollateralOutlook[]): number {
  return collateral.reduce((sum, c) => sum + c.collateralValueUsd * c.liqThreshold, 0)
}

/** Per-asset liquidation price, holding every other collateral at its current value. */
function collateralLiqPrice(collateral: BorrowCollateralOutlook[], target: BorrowCollateralOutlook, debtUsd: number) {
  const others = liquidationValue(collateral) - target.collateralValueUsd * target.liqThreshold
  const needed = debtUsd - others
  if (needed <= 0) return null // this asset alone can't liquidate you
  const liqPrice = needed / (target.quantity * target.liqThreshold)
  return { liqPrice, dropBuffer: Math.max(0, (target.currentPriceUsd - liqPrice) / target.currentPriceUsd) }
}

function pctText(fraction: number) {
  return `${(fraction * 100).toFixed(0)}%`
}

export function BorrowOutlook() {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const data = MOCK_BORROW_OUTLOOK
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  const totalCollateral = useMemo(
    () => data.collateral.reduce((s, c) => s + c.collateralValueUsd, 0),
    [data.collateral],
  )
  const liqValue = useMemo(() => liquidationValue(data.collateral), [data.collateral])
  const currentHf = data.totalDebtUsd > 0 ? liqValue / data.totalDebtUsd : Infinity

  // Projected borrowing cost at the current variable rate (continuous compounding).
  const projectedCost = useMemo(
    () => ({
      m1: projectedEarnings(data.totalDebtUsd, data.borrowApyPct, 30),
      m3: projectedEarnings(data.totalDebtUsd, data.borrowApyPct, 91),
      y1: projectedEarnings(data.totalDebtUsd, data.borrowApyPct, 365),
    }),
    [data.totalDebtUsd, data.borrowApyPct],
  )

  // ── What-if simulator ──────────────────────────────────────────────────────
  const [priceMove, setPriceMove] = useState(0) // % applied to all collateral
  const [debtChange, setDebtChange] = useState(0) // $ added (>0) or repaid (<0)

  const sim = useMemo(() => {
    const simCollateralValue = totalCollateral * (1 + priceMove / 100)
    const simLiqValue = liqValue * (1 + priceMove / 100)
    const simDebt = Math.max(0, data.totalDebtUsd + debtChange)
    const simHf = simDebt > 0 ? simLiqValue / simDebt : Infinity
    const currentBuffer = Number.isFinite(currentHf) ? Math.max(0, 1 - 1 / currentHf) : 1
    const simBuffer = Number.isFinite(simHf) ? Math.max(0, 1 - 1 / simHf) : 1
    return { simCollateralValue, simDebt, simHf, currentBuffer, simBuffer }
  }, [priceMove, debtChange, totalCollateral, liqValue, data.totalDebtUsd, currentHf])

  const simBand = healthFactorBand(sim.simHf)
  const maxBorrow = Math.round(data.totalDebtUsd * 0.75)

  return (
    <OutlookSection
      title={t("Borrow Outlook")}
      info="How safe your position is over time, and what it would take to reach liquidation."
    >
      {/* Projected borrowing cost */}
      <OutlookCard title={t("Projected interest cost")} subtitle={t("At today's borrow rate.")}>
        <dl className="grid grid-cols-3 gap-3">
          {[
            { label: t("30 days"), value: projectedCost.m1 },
            { label: t("90 days"), value: projectedCost.m3 },
            { label: t("1 year"), value: projectedCost.y1 },
          ].map((row) => (
            <div key={row.label} className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{row.label}</dt>
              <dd className="mt-1 font-data text-[17px] font-medium tabular-nums text-danger">
                −{m(formatUsdExact(row.value))}
              </dd>
            </div>
          ))}
        </dl>
        <OutlookDisclaimer>{t("Estimate. Variable rate — actual cost will differ.")}</OutlookDisclaimer>
      </OutlookCard>

      {/* Per-collateral liquidation table */}
      <OutlookCard
        title={t("Liquidation prices")}
        subtitle={t("The price each collateral would hit to reach liquidation, holding your other collateral steady.")}
      >
        <div className="hidden overflow-x-auto md:block">
          <DesktopTableSurface className="!rounded-none">
            <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-[13px]">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[19%]" />
                <col className="w-[19%]" />
                <col className="w-[19%]" />
                <col className="w-[19%]" />
              </colgroup>
              <thead>
                <tr className="text-left">
                  {[t("Collateral"), t("Price"), t("Liq. price"), t("Drop buffer"), t("Supply APY")].map((h, i) => (
                    <th
                      key={h}
                      className={`bg-table-header px-4 pb-2 pt-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58 ${i === 0 ? "" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-white/6">
                {data.collateral.map((c) => {
                  const liq = collateralLiqPrice(data.collateral, c, data.totalDebtUsd)
                  return (
                    <tr key={c.symbol} className="text-[14px]">
                      <td className="py-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <TokenIcon symbol={c.symbol} size="table" />
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground dark:text-white">{c.symbol}</span>
                            <span className="text-[12px] text-muted-foreground">
                              {c.quantity} · {m(formatCompactUsd(c.collateralValueUsd))}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-data tabular-nums text-foreground">
                        {formatUsdExact(c.currentPriceUsd)}
                      </td>
                      <td className="py-3 pr-4 text-right font-data tabular-nums text-foreground">
                        {liq ? formatUsdExact(liq.liqPrice) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-data tabular-nums text-success">
                        {liq ? pctText(liq.dropBuffer) : t("safe")}
                      </td>
                      <td className="py-3 pr-4 text-right font-data tabular-nums text-muted-foreground">
                        {c.supplyApyPct.toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </DesktopTableSurface>
        </div>

        <div className="space-y-2 md:hidden">
          {data.collateral.map((c) => {
            const liq = collateralLiqPrice(data.collateral, c, data.totalDebtUsd)
            return (
              <div key={c.symbol} className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TokenIcon symbol={c.symbol} size="table" />
                    <span className="text-[14px] font-medium text-foreground">{c.symbol}</span>
                  </div>
                  <span className="font-data text-[13px] tabular-nums text-muted-foreground">
                    {formatUsdExact(c.currentPriceUsd)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">
                    {t("Liq.")} {liq ? formatUsdExact(liq.liqPrice) : "—"}
                  </span>
                  <span className="text-success">{liq ? `${pctText(liq.dropBuffer)} ${t("buffer")}` : t("safe")}</span>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-3 text-[11.5px] text-muted-foreground/80">
          {t("“Safe” means a fall in that asset alone can't liquidate you — your other collateral covers the debt.")}
        </p>
      </OutlookCard>

      <div>
        {/* What-if simulator */}
        <OutlookCard
          title={t("What-if simulator")}
          subtitle={t("Move collateral prices or your debt and watch health factor respond.")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
              <span className="flex items-center justify-between uppercase tracking-[0.08em]">
                <span>{t("Collateral price move")}</span>
                <span
                  className={`font-data normal-case tabular-nums ${priceMove === 0 ? "text-muted-foreground" : "text-primary"}`}
                >
                  {priceMove > 0 ? "+" : ""}
                  {priceMove}%
                </span>
              </span>
              <input
                type="range"
                min={-60}
                max={60}
                step={1}
                value={priceMove}
                onChange={(e) => setPriceMove(Number(e.target.value))}
                aria-label={t("Collateral price move percentage")}
                className="w-full accent-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
              <span className="flex items-center justify-between uppercase tracking-[0.08em]">
                <span>{debtChange >= 0 ? t("Borrow more") : t("Repay")}</span>
                <span
                  className={`font-data normal-case tabular-nums ${debtChange === 0 ? "text-muted-foreground" : "text-primary"}`}
                >
                  {debtChange > 0 ? "+" : ""}
                  {m(formatUsdExact(debtChange))}
                </span>
              </span>
              <input
                type="range"
                min={-data.totalDebtUsd}
                max={maxBorrow}
                step={250}
                value={debtChange}
                onChange={(e) => setDebtChange(Number(e.target.value))}
                aria-label={t("Debt change amount")}
                className="w-full accent-primary"
              />
            </label>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Health factor")}</dt>
              <dd className={`mt-1 font-data text-[18px] font-medium tabular-nums ${simBand.textClass}`}>
                {formatHealthFactor(sim.simHf)}
              </dd>
              <dd className="text-[12px] text-muted-foreground">
                {t("was")} {formatHealthFactor(currentHf)}
              </dd>
            </div>
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Drop buffer")}</dt>
              <dd className="mt-1 font-data text-[18px] font-medium tabular-nums text-foreground">
                {pctText(sim.simBuffer)}
              </dd>
              <dd className="text-[12px] text-muted-foreground">
                {t("was")} {pctText(sim.currentBuffer)}
              </dd>
            </div>
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Collateral value")}</dt>
              <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">
                {m(formatUsdExact(sim.simCollateralValue))}
              </dd>
              <dd className="text-[12px] text-muted-foreground">
                {t("was")} {m(formatUsdExact(totalCollateral))}
              </dd>
            </div>
            <div className="rounded-radius-sm border border-border bg-background px-3 py-2.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{t("Total debt")}</dt>
              <dd className="mt-1 font-data text-[15px] font-medium tabular-nums text-foreground">
                {m(formatUsdExact(sim.simDebt))}
              </dd>
              <dd className="text-[12px] text-muted-foreground">
                {t("was")} {m(formatUsdExact(data.totalDebtUsd))}
              </dd>
            </div>
          </dl>
        </OutlookCard>
      </div>
    </OutlookSection>
  )
}

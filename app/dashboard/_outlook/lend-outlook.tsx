"use client"

/**
 * Lend → "Lend Outlook". Forward-looking companion to the Lend tab: a projection
 * matrix — horizons across the top, bear/base/bull scenarios down the side. Each
 * cell shows the projected interest ($, big) with the effective APY (small)
 * underneath, like the Lend-page table's two-line "Available" column. Because the
 * reward boost is temporary, the effective APY blends down over longer horizons.
 *
 * UI-only phase — fed by MOCK_LEND_OUTLOOK. Wiring later swaps the mock for the
 * real lend hydrator + *DailyStats APY history (see plan / forecast-core notes).
 */

import { useMemo } from "react"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { DesktopTableSurface } from "@/app/components/market-table-primitives"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { MOCK_LEND_OUTLOOK, type LendPositionOutlook } from "./mock-data"
import { OutlookSection } from "./outlook-shell"
import {
  TIMEFRAMES,
  projectedEarnings,
  scenarioYield,
  SCENARIO_ORDER,
  SCENARIOS,
  type ScenarioId,
} from "./forecast-core"

const MASK = "••••"

/** Projected interest ($) and effective annualized APY (%) for a horizon + scenario. */
function projectCell(positions: LendPositionOutlook[], days: number, scenario: ScenarioId) {
  let principal = 0
  let interest = 0
  for (const p of positions) {
    principal += p.principalUsd
    interest += projectedEarnings(p.principalUsd, scenarioYield(p.baseApyPct, scenario), days)
    // Rewards are temporary: only accrue while the incentive program runs.
    const rewardDays = Math.min(days, p.rewardEndsInDays)
    interest += projectedEarnings(p.principalUsd, scenarioYield(p.rewardApyPct, scenario), rewardDays)
  }
  const apy = principal > 0 && days > 0 ? (Math.pow(1 + interest / principal, 365 / days) - 1) * 100 : 0
  return { total: interest, apy }
}

export function LendOutlook() {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const positions = MOCK_LEND_OUTLOOK.positions

  const m = (value: string) => (showDollarAmounts ? value : MASK)

  // Rows = scenarios, columns = horizons; cell = { projected interest $, effective APY % }.
  const matrix = useMemo(
    () =>
      SCENARIO_ORDER.map((sid) => ({
        sid,
        cells: TIMEFRAMES.map((tf) => projectCell(positions, tf.days, sid)),
      })),
    [positions],
  )

  return (
    <OutlookSection
      title={t("Lend Outlook")}
      info="Projected interest with the effective APY beneath it, by scenario and horizon. The reward boost is temporary, so longer horizons blend down to the base rate. Estimates, not guarantees."
    >
      <div className="overflow-x-auto">
        <DesktopTableSurface className="!rounded-none">
          <table className="w-full min-w-[620px] table-fixed border-separate border-spacing-0 text-[14px]">
            <colgroup>
              <col className="w-[16%]" />
              {TIMEFRAMES.map((tf) => (
                <col key={tf.id} className="w-[16.8%]" />
              ))}
            </colgroup>
            <thead>
              <tr className="text-left">
                <th className="bg-table-header px-5 pb-2.5 pt-3 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58">
                  {t("Scenario")}
                </th>
                {TIMEFRAMES.map((tf) => (
                  <th
                    key={tf.id}
                    className="bg-table-header px-4 pb-2.5 pt-3 text-right text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-white/58"
                  >
                    {t(tf.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-white/6">
              {matrix.map(({ sid, cells }) => {
                const isBase = sid === "base"
                return (
                  <tr key={sid} className="transition-colors hover:bg-muted/40">
                    <td className="py-4 pl-5 align-top">
                      <span
                        className={
                          isBase
                            ? "text-[15px] font-semibold tracking-[-0.03em] text-foreground dark:text-white"
                            : "text-[15px] font-medium tracking-[-0.03em] text-muted-foreground"
                        }
                      >
                        {t(SCENARIOS[sid].label)}
                      </span>
                    </td>
                    {cells.map((cell, i) => (
                      <td key={TIMEFRAMES[i].id} className="py-4 pr-4 text-right align-top last:pr-5">
                        <div
                          className={`font-data text-[15px] tabular-nums tracking-[-0.03em] ${
                            isBase ? "font-medium text-foreground dark:text-white" : "text-foreground/90"
                          }`}
                        >
                          {m(formatUsdExact(cell.total))}
                        </div>
                        <div className="mt-0.5 font-data text-[12.5px] tabular-nums text-muted-foreground">
                          {cell.apy.toFixed(2)}%
                        </div>
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DesktopTableSurface>
      </div>
    </OutlookSection>
  )
}

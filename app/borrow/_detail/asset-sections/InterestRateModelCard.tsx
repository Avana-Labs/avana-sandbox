"use client"

import * as React from "react"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { buildBorrowInterestRateCurve } from "@/app/lib/borrow-detail/interest-rate-curve"
import { resolveBorrowDetailMetricHelp } from "@/app/lib/borrow-detail/metric-help"
import { resolveInterestRateModelParams, type ProtocolParameterRow } from "@/app/lib/borrow-detail/protocol-parameters"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

type Props = {
  utilizationPct: number
  borrowAprPct: number
  protocolParameters: ProtocolParameterRow[]
  className?: string
}

const X_TICKS = [0, 25, 50, 75, 100]
const VIEW_W = 640
const VIEW_H = 300
const PLOT_LEFT = 52
const PLOT_RIGHT = 624
const PLOT_TOP = 40
const PLOT_BOTTOM = 264

function formatPct(value: number, digits = 2) {
  return `${value.toFixed(digits)}%`
}

function readQuickStatPercent(
  quickStats: ReadonlyArray<{ id: string; value: string }>,
  id: string,
  fallback: number,
): number {
  const raw = quickStats.find((stat) => stat.id === id)?.value ?? ""
  const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : fallback
}

function plotX(utilization: number) {
  return PLOT_LEFT + (utilization / 100) * (PLOT_RIGHT - PLOT_LEFT)
}

function plotY(apr: number, maxApr: number) {
  return PLOT_BOTTOM - (apr / maxApr) * (PLOT_BOTTOM - PLOT_TOP)
}

/** Map a borrowable asset detail into InterestRateModelCard props. */
export function interestRateModelFromAssetDetail(detail: AssetDetail): Omit<Props, "className"> {
  if (detail.interestRateModel) {
    return {
      utilizationPct: detail.interestRateModel.utilizationPct,
      borrowAprPct: detail.interestRateModel.borrowAprPct,
      protocolParameters: [
        {
          id: "optimalUtilization",
          label: "Optimal utilization",
          value: formatPct(detail.interestRateModel.optimalUtilizationPct),
        },
        {
          id: "slopeBelowOptimal",
          label: "Slope below optimal",
          value: formatPct(detail.interestRateModel.slopeBelowOptimalPct),
        },
        {
          id: "slopeAboveOptimal",
          label: "Slope above optimal",
          value: formatPct(detail.interestRateModel.slopeAboveOptimalPct),
        },
        {
          id: "baseBorrowRate",
          label: "Base borrow rate",
          value: formatPct(detail.interestRateModel.baseBorrowRatePct),
        },
      ],
    }
  }
  return {
    utilizationPct: readQuickStatPercent(detail.quickStats, "utilization", detail.row.utilization),
    borrowAprPct: readQuickStatPercent(detail.quickStats, "borrowApy", detail.row.borrowApr),
    protocolParameters: detail.protocolParameters,
  }
}

export function InterestRateModelCard({ utilizationPct, borrowAprPct, protocolParameters, className }: Props) {
  const { t } = useTranslation()
  const currentUtilization = Number.isFinite(utilizationPct) ? utilizationPct : 0
  const currentBorrowApr = Number.isFinite(borrowAprPct) ? borrowAprPct : 4
  const irm = React.useMemo(() => resolveInterestRateModelParams(protocolParameters), [protocolParameters])

  const helpText = t("Borrow APR rises as utilization increases and steepens past the optimal threshold.")

  const curve = React.useMemo(
    () => buildBorrowInterestRateCurve(currentUtilization, currentBorrowApr, irm),
    [currentUtilization, currentBorrowApr, irm],
  )

  const paramRows = [
    {
      id: "optimalUtilization",
      label: "Optimal utilization",
      value: formatPct(irm.optimalUtilizationPct),
    },
    {
      id: "slopeBelowOptimal",
      label: "Slope below optimal",
      value: formatPct(irm.slopeBelowOptimalPct),
    },
    {
      id: "slopeAboveOptimal",
      label: "Slope above optimal",
      value: formatPct(irm.slopeAboveOptimalPct),
    },
    {
      // Base rate is read off the anchored curve (its 0%-utilization value) so the
      // displayed base rate is consistent with the plotted curve + "Current" marker,
      // rather than the slug-hashed param that has no relation to the paid APR.
      id: "baseBorrowRate",
      label: "Base borrow rate",
      value: formatPct(curve.baseApr),
    },
  ] as const

  const pathD = React.useMemo(
    () =>
      curve.points
        .map((point, index) => {
          const x = plotX(point.utilization)
          const y = plotY(point.apr, curve.maxApr)
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`
        })
        .join(" "),
    [curve],
  )

  const currentX = plotX(curve.currentUtilization)
  const optimalX = plotX(curve.optimalUtilization)
  const utilizationHelp = resolveBorrowDetailMetricHelp("Utilisation rate")

  return (
    <section className={cn("min-w-0", className)} aria-label={t("Interest rate model")}>
      <div className="flex items-center gap-1.5">
        <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
          {t("Interest rate model")}
        </h2>
        <ActionMetricHelp text={helpText} topic="Interest rate model" />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)] lg:items-stretch lg:gap-10">
        <div className="relative min-w-0 rounded-radius-md bg-muted/30 dark:bg-white/[0.03]">
          <div className="relative h-[260px] w-full sm:h-[300px] lg:h-full lg:min-h-[300px]">
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className="absolute inset-0 h-full w-full select-none"
              role="img"
              aria-label={t("Borrow APR versus utilization")}
            >
              {curve.yTicks.map((tick) => {
                const y = plotY(tick, curve.maxApr)
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={PLOT_LEFT}
                      x2={PLOT_RIGHT}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                      strokeDasharray="1 5"
                      className="text-foreground"
                    />
                    <text
                      x={PLOT_LEFT - 10}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {tick}%
                    </text>
                  </g>
                )
              })}

              {X_TICKS.map((tick) => (
                <text
                  key={`x-${tick}`}
                  x={plotX(tick)}
                  y={VIEW_H - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {tick}%
                </text>
              ))}

              <path
                d={pathD}
                fill="none"
                className="text-[hsl(var(--brand))]"
                stroke="currentColor"
                strokeWidth={3.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              <line
                x1={optimalX}
                x2={optimalX}
                y1={PLOT_TOP + 10}
                y2={PLOT_BOTTOM}
                stroke="rgba(1, 170, 207, 0.9)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
              <line
                x1={currentX}
                x2={currentX}
                y1={PLOT_TOP + 24}
                y2={PLOT_BOTTOM}
                stroke="rgba(1, 170, 207, 0.9)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />

              <text
                x={optimalX}
                y={PLOT_TOP}
                textAnchor="middle"
                className="fill-muted-foreground text-[12px] font-medium"
              >
                {t("Optimal")}
              </text>
              <text
                x={currentX}
                y={PLOT_TOP + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[12px] font-medium"
              >
                {t("Current {value}%").replace("{value}", currentUtilization.toFixed(1))}
              </text>
            </svg>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col justify-center lg:pl-2">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-normal leading-snug text-muted-foreground">
                {t("Utilization rate")}
              </span>
              {utilizationHelp ? <ActionMetricHelp text={utilizationHelp} topic="Utilization rate" /> : null}
            </div>
            <div className="mt-2 font-data text-[28px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[32px]">
              {formatPct(currentUtilization)}
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5 dark:border-white/10">
            <ul className="space-y-4">
              {paramRows.map((row) => {
                const tooltip = resolveBorrowDetailMetricHelp(row.label)
                return (
                  <li key={row.id} className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="text-[13px] font-normal leading-snug text-muted-foreground">{t(row.label)}</span>
                      {tooltip ? <ActionMetricHelp text={tooltip} topic={row.label} /> : null}
                    </div>
                    <span className="shrink-0 font-data text-[14px] font-medium tabular-nums text-foreground">
                      {row.value}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}

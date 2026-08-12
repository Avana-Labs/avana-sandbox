"use client"

import * as React from "react"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import type { AssetDetail } from "@/app/lib/borrow-detail"
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

type CurvePoint = { utilization: number; apr: number }

const X_TICKS = [0, 25, 50, 75, 100]
const Y_TICKS = [0, 5, 10]

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

/** Map a borrowable asset detail into InterestRateModelCard props. */
export function interestRateModelFromAssetDetail(detail: AssetDetail): Omit<Props, "className"> {
  return {
    utilizationPct: readQuickStatPercent(detail.quickStats, "utilization", detail.row.utilization),
    borrowAprPct: readQuickStatPercent(detail.quickStats, "borrowApy", detail.row.borrowApr),
    protocolParameters: detail.protocolParameters,
  }
}

export function InterestRateModelCard({ utilizationPct, borrowAprPct, protocolParameters, className }: Props) {
  const { t } = useTranslation()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const currentUtilization = Number.isFinite(utilizationPct) ? utilizationPct : 0
  const currentBorrowApr = Number.isFinite(borrowAprPct) ? borrowAprPct : 4
  const irm = resolveInterestRateModelParams(protocolParameters)
  const optimalUtilization = irm.optimalUtilizationPct

  const helpText = t("Borrow APR rises as utilization increases and steepens past the optimal threshold.")

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
      id: "baseBorrowRate",
      label: "Base borrow rate",
      value: formatPct(irm.baseBorrowRatePct),
    },
  ] as const

  const curve = React.useMemo(
    () => buildBorrowCurve(currentUtilization, currentBorrowApr, irm),
    [currentUtilization, currentBorrowApr, irm],
  )

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      const rect = container.getBoundingClientRect()
      const styles = getComputedStyle(container)
      const brand = (styles.getPropertyValue("--brand") || "191 99% 41%").trim()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      const gridColor = "rgba(65, 74, 104, 0.12)"
      const curveColor = `hsl(${brand})`
      const markerColor = "rgba(1, 170, 207, 0.9)"
      const plotLeft = 48
      const plotRight = rect.width - 16
      const plotTop = 36
      const plotBottom = rect.height - 36
      const plotWidth = plotRight - plotLeft
      const plotHeight = plotBottom - plotTop

      ctx.save()
      ctx.lineWidth = 1
      ctx.strokeStyle = gridColor
      ctx.setLineDash([1, 5])
      Y_TICKS.forEach((tick) => {
        const y = plotBottom - (tick / 10) * plotHeight
        ctx.beginPath()
        ctx.moveTo(plotLeft, y)
        ctx.lineTo(plotRight, y)
        ctx.stroke()
      })
      ctx.restore()

      ctx.save()
      ctx.lineWidth = 3.5
      ctx.strokeStyle = curveColor
      ctx.lineJoin = "round"
      ctx.lineCap = "round"
      ctx.setLineDash([])
      ctx.beginPath()
      curve.points.forEach((point, index) => {
        const x = plotLeft + (point.utilization / 100) * plotWidth
        const y = plotBottom - (point.apr / curve.maxApr) * plotHeight
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = markerColor
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      const currentX = plotLeft + (curve.currentUtilization / 100) * plotWidth
      const optimalX = plotLeft + (curve.optimalUtilization / 100) * plotWidth
      ctx.beginPath()
      ctx.moveTo(currentX, plotTop + 24)
      ctx.lineTo(currentX, plotBottom)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(optimalX, plotTop + 10)
      ctx.lineTo(optimalX, plotBottom)
      ctx.stroke()
      ctx.restore()
    }

    draw()

    const ro = new ResizeObserver(draw)
    ro.observe(container)

    return () => ro.disconnect()
  }, [curve])

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
            <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full select-none" />

            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[6] w-12 pt-9 pb-9">
              {Y_TICKS.map((tick) => (
                <div
                  key={tick}
                  className="absolute left-2 translate-y-[-50%] text-left text-[11px] font-normal leading-none text-muted-foreground"
                  style={{ top: `${((10 - tick) / 10) * 100}%` }}
                >
                  {tick}%
                </div>
              ))}
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-2 z-[6] h-6 pl-12 pr-4">
              {X_TICKS.map((tick) => (
                <div
                  key={tick}
                  className="absolute bottom-0 translate-x-[-50%] text-[11px] font-normal leading-none text-muted-foreground"
                  style={{ left: `${12 + tick * 0.76}%` }}
                >
                  {tick}%
                </div>
              ))}
            </div>

            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 z-[6] h-0 pl-12 pr-4">
              <div
                className="absolute -translate-x-1/2 text-[12px] font-medium leading-none text-muted-foreground"
                style={{
                  left: `${Math.min(92, 12 + currentUtilization * 0.76)}%`,
                  top: "14px",
                }}
              >
                {t("Current {value}%").replace("{value}", currentUtilization.toFixed(1))}
              </div>
              <div
                className="absolute -translate-x-1/2 text-[12px] font-medium leading-none text-muted-foreground"
                style={{
                  left: `${Math.min(88, 12 + optimalUtilization * 0.76)}%`,
                  top: "0px",
                }}
              >
                {t("Optimal")}
              </div>
            </div>
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

function buildBorrowCurve(
  currentUtilization: number,
  currentBorrowApr: number,
  irm: ReturnType<typeof resolveInterestRateModelParams>,
) {
  const points: CurvePoint[] = []
  const optimalUtilization = irm.optimalUtilizationPct
  const anchorApr = irm.baseBorrowRatePct + irm.slopeBelowOptimalPct
  const maxBorrowApr = Math.max(10, anchorApr + irm.slopeAboveOptimalPct, currentBorrowApr + 2)

  for (let util = 0; util <= 100; util += 1) {
    let apr: number
    if (util <= optimalUtilization) {
      const t = util / optimalUtilization
      apr = irm.baseBorrowRatePct + irm.slopeBelowOptimalPct * t
    } else {
      const t = (util - optimalUtilization) / (100 - optimalUtilization)
      apr = anchorApr + irm.slopeAboveOptimalPct * t
    }
    points.push({ utilization: util, apr })
  }

  return {
    points,
    currentUtilization: Math.min(100, Math.max(0, currentUtilization)),
    optimalUtilization,
    maxApr: maxBorrowApr,
  }
}

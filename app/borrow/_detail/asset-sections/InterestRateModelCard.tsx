"use client"

import * as React from "react"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"

type Props = {
  detail: AssetDetail
  className?: string
}

type CurvePoint = { utilization: number; apr: number }

const X_TICKS = [0, 25, 50, 75, 100]
const Y_TICKS = [0, 5, 10]

export function InterestRateModelCard({ detail, className }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const utilization = getQuickStatPercent(detail, "utilization", 0)
  const borrowApr = getQuickStatPercent(detail, "borrowApy", 4)
  const currentUtilization = Number.isFinite(utilization) ? utilization : 0
  const currentBorrowApr = Number.isFinite(borrowApr) ? borrowApr : 4
  const optimalUtilization = 92

  const curve = React.useMemo(
    () => buildBorrowCurve(currentUtilization, currentBorrowApr, optimalUtilization),
    [currentUtilization, currentBorrowApr],
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
      const plotLeft = 72
      const plotRight = rect.width - 40
      const plotTop = 32
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
      ctx.lineWidth = 4
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
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      const currentX = plotLeft + (curve.currentUtilization / 100) * plotWidth
      const optimalX = plotLeft + (curve.optimalUtilization / 100) * plotWidth
      ctx.beginPath()
      ctx.moveTo(currentX, plotTop + 28)
      ctx.lineTo(currentX, plotBottom)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(optimalX, plotTop + 12)
      ctx.lineTo(optimalX, plotBottom)
      ctx.stroke()
      ctx.restore()
    }

    draw()

    const ro = new ResizeObserver(draw)
    ro.observe(container)

    return () => ro.disconnect()
  }, [curve])

  return (
    <section className={cn("min-w-0", className)}>
      <div className="min-w-0">
        <div className="min-w-0">
          <h2 className="text-[21px] font-normal leading-none tracking-[-0.02em] text-[hsl(var(--brand))]">Interest rate model</h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground">
            Borrow APR rises as utilization increases and steepens past the optimal threshold.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative h-[300px] w-full sm:h-[330px]">
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full select-none" />

          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[6] w-16">
            {Y_TICKS.map((tick) => {
              const y = 32 + (1 - tick / curve.maxApr) * (300 - 68)
              return (
                <div
                  key={tick}
                  className="absolute left-0 translate-y-[-50%] text-left text-[11px] font-normal leading-none text-[#A0A5BA]"
                  style={{ top: `${(y / 300) * 100}%` }}
                >
                  {tick}%
                </div>
              )
            })}
          </div>

          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 right-16 z-[6] h-9">
            {X_TICKS.map((tick) => {
              return (
                <div
                  key={tick}
                  className="absolute bottom-0 translate-x-[-50%] text-[11px] font-normal leading-none text-[#A0A5BA]"
                  style={{ left: `${((72 + (tick / 100) * (1000 - 112)) / 1000) * 100}%` }}
                >
                  {tick}%
                </div>
              )
            })}
          </div>

          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 z-[6] h-0">
            <div
              className="absolute -translate-x-1/2 text-[13px] font-medium leading-none text-[#6A728A]"
              style={{ left: `${Math.min(96, 7.2 + currentUtilization * 0.888)}%`, top: "18px" }}
            >
              Current {currentUtilization.toFixed(2)}%
            </div>
            <div
              className="absolute -translate-x-1/2 text-[13px] font-medium leading-none text-[#6A728A]"
              style={{ left: `${Math.min(88, 7.2 + optimalUtilization * 0.888 - 8)}%`, top: "28px" }}
            >
              Optimal 92%
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function getQuickStatPercent(detail: AssetDetail, id: string, fallback: number): number {
  const raw = detail.quickStats.find((stat) => stat.id === id)?.value ?? ""
  const numeric = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : fallback
}

function buildBorrowCurve(currentUtilization: number, currentBorrowApr: number, optimalUtilization: number) {
  const points: CurvePoint[] = []
  const maxBorrowApr = 10
  const anchorApr = Math.max(1.5, currentBorrowApr)

  for (let util = 0; util <= 100; util += 1) {
    let apr: number
    if (util <= optimalUtilization) {
      const t = util / optimalUtilization
      apr = 0.12 + (anchorApr / 1.08) * Math.pow(t, 1.2)
    } else {
      const t = (util - optimalUtilization) / (100 - optimalUtilization)
      apr = anchorApr + (maxBorrowApr - anchorApr) * Math.pow(t, 0.9)
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

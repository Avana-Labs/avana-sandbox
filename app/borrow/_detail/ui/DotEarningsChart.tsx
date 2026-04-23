"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Series } from "@/app/lib/borrow-detail"

type DotEarningsChartProps = {
  series: Series
  height?: number
  className?: string
  ariaLabel?: string
  /** Tailwind stroke class, default emerald for positive earnings feel. */
  strokeClassName?: string
  /** Tailwind fill class for each dot. */
  dotClassName?: string
}

/**
 * A thin line with a dot at every sample. Used by the "Interest generated"
 * / "LP earnings" card where each point is a discrete period.
 */
export function DotEarningsChart({
  series,
  height = 140,
  className,
  ariaLabel,
  strokeClassName = "stroke-emerald-500",
  dotClassName = "fill-emerald-500",
}: DotEarningsChartProps) {
  const width = 560
  const { line, dots } = React.useMemo(() => {
    if (series.points.length === 0) return { line: "", dots: [] as Array<{ x: number; y: number }> }
    const vals = series.points.map((p) => p.v)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const range = max - min || 1
    const stepX = width / Math.max(1, series.points.length - 1)
    const coords = series.points.map((p, i) => ({
      x: i * stepX,
      y: 6 + (1 - (p.v - min) / range) * (height - 12),
    }))
    const line = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
      .join(" ")
    return { line, dots: coords }
  }, [series.points, height])

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? `${series.label} chart`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-auto w-full", className)}
      data-series-id={series.id}
    >
      <path d={line} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className={strokeClassName} />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={2.2} className={dotClassName} />
      ))}
    </svg>
  )
}

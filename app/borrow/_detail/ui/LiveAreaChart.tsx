"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Series } from "@/app/lib/borrow-detail"

type LiveAreaChartProps = {
  series: Series
  height?: number
  /** Tailwind stroke class, e.g. "stroke-emerald-500". */
  strokeClassName?: string
  /** Tailwind fill class for the gradient top, e.g. "text-emerald-500/40". */
  fillTopClassName?: string
  className?: string
  ariaLabel?: string
  /** Optional formatter for tooltip-like latest value. */
  formatValue?: (v: number) => string
  /** Renders a faint baseline when true. */
  showBaseline?: boolean
}

/**
 * Tiny dependency-free SVG area chart. Renders an area + stroke over a
 * normalized coordinate space. Uses `currentColor` for the gradient so
 * Tailwind text classes control the color.
 */
export function LiveAreaChart({
  series,
  height = 180,
  strokeClassName = "stroke-foreground",
  fillTopClassName = "text-foreground/30",
  className,
  ariaLabel,
  formatValue,
  showBaseline = true,
}: LiveAreaChartProps) {
  const points = series.points
  const id = React.useId()
  const width = 600

  const { pathLine, pathArea, latest } = React.useMemo(() => {
    if (points.length === 0) return { pathLine: "", pathArea: "", latest: 0 }
    const values = points.map((p) => p.v)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const stepX = width / Math.max(1, points.length - 1)
    const toY = (v: number) => {
      const norm = (v - min) / range
      return Math.round((1 - norm) * (height - 8)) + 4
    }
    const coords = points.map((p, i) => [i * stepX, toY(p.v)] as const)
    const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")
    const area = `${line} L${width} ${height} L0 ${height} Z`
    return { pathLine: line, pathArea: area, latest: values[values.length - 1] }
  }, [points, height])

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        role="img"
        aria-label={ariaLabel ?? `${series.label} chart`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-auto w-full"
        data-series-id={series.id}
        data-latest={latest}
        data-formatted={formatValue ? formatValue(latest) : undefined}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" className={fillTopClassName} />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={fillTopClassName} />
          </linearGradient>
        </defs>
        {showBaseline ? (
          <line x1={0} x2={width} y1={height - 1} y2={height - 1} className="stroke-border" strokeWidth={1} />
        ) : null}
        <path d={pathArea} fill={`url(#grad-${id})`} />
        <path d={pathLine} className={cn("fill-none", strokeClassName)} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { Series } from "@/app/lib/borrow-detail"

type GroupedBarsProps = {
  /** Each series becomes a color family; bars are grouped by x-index. */
  groups: Series[]
  height?: number
  className?: string
  ariaLabel?: string
  /** Tailwind fill classes per group. */
  fillClassNames?: string[]
  /** Highlight the given bar index inside each group (e.g. the selected period). */
  highlightIndex?: number | null
  /** Max number of x-samples to render. Oversized arrays are down-sampled. */
  maxBars?: number
}

const DEFAULT_FILLS = ["fill-emerald-500", "fill-amber-500", "fill-sky-500", "fill-rose-500"]

/**
 * Pure-SVG grouped bar chart used by the Cashflow card.
 * Down-samples any series longer than `maxBars` by averaging chunks so
 * yearly series stay readable on mobile.
 */
export function GroupedBars({
  groups,
  height = 140,
  className,
  ariaLabel,
  fillClassNames = DEFAULT_FILLS,
  highlightIndex = null,
  maxBars = 24,
}: GroupedBarsProps) {
  const width = 560
  const buckets = React.useMemo(() => downsample(groups, maxBars), [groups, maxBars])
  const allValues = buckets.flatMap((b) => b.values)
  const max = Math.max(1, ...allValues)
  const barCount = buckets.length
  const groupWidth = width / Math.max(1, barCount)
  const innerGroupPad = 4
  const seriesCount = groups.length
  const barWidth = Math.max(2, (groupWidth - innerGroupPad * 2) / Math.max(1, seriesCount) - 1)

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? "Grouped bars"}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-auto w-full", className)}
      data-bar-count={barCount}
    >
      <line x1={0} x2={width} y1={height - 1} y2={height - 1} className="stroke-border" strokeWidth={1} />
      {buckets.map((bucket, i) => {
        const baseX = i * groupWidth + innerGroupPad
        const isHighlight = highlightIndex !== null && highlightIndex === i
        return (
          <g key={i} data-bar-index={i}>
            {bucket.values.map((v, s) => {
              const h = Math.max(1, (v / max) * (height - 4))
              const x = baseX + s * (barWidth + 1)
              const y = height - h - 1
              return (
                <rect
                  key={s}
                  x={x.toFixed(2)}
                  y={y.toFixed(2)}
                  width={barWidth.toFixed(2)}
                  height={h.toFixed(2)}
                  className={cn(fillClassNames[s] ?? "fill-foreground/60", isHighlight ? "opacity-100" : "opacity-85")}
                  rx={1}
                />
              )
            })}
            {isHighlight ? (
              <rect
                x={baseX - 2}
                y={0}
                width={groupWidth - innerGroupPad * 2 + 4}
                height={height}
                className="fill-foreground/5"
                rx={3}
              />
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function downsample(groups: Series[], maxBars: number): Array<{ label: string; values: number[] }> {
  if (groups.length === 0) return []
  const base = groups[0].points.length
  if (base <= maxBars) {
    return Array.from({ length: base }, (_, i) => ({
      label: groups[0].points[i]?.t ?? `${i}`,
      values: groups.map((g) => g.points[i]?.v ?? 0),
    }))
  }
  const step = Math.ceil(base / maxBars)
  const buckets: Array<{ label: string; values: number[] }> = []
  for (let start = 0; start < base; start += step) {
    const end = Math.min(base, start + step)
    const values = groups.map((g) => {
      let sum = 0
      let n = 0
      for (let k = start; k < end; k++) {
        sum += g.points[k]?.v ?? 0
        n++
      }
      return n ? sum / n : 0
    })
    buckets.push({ label: groups[0].points[start]?.t ?? `${start}`, values })
  }
  return buckets
}

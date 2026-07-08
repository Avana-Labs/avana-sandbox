"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { useMediaQuery } from "@/app/lib/use-media-query"
import type { ChartPoint, ChartRangeOption } from "./types"

const TONE_COLORS = {
  // Up trend uses the Avana brand cyan; down stays red.
  positive: { stroke: "#01AACF", fill: "#01AACF", cursor: "rgba(1, 170, 207, 0.2)" },
  negative: { stroke: "#F0444C", fill: "#F0444C", cursor: "rgba(240, 68, 76, 0.2)" },
} as const

type HeroAreaChartProps = {
  data: ChartPoint[]
  activeRange: ChartRangeOption
  height?: number
  formatValue?: (value: number) => string
  formatYAxis?: (value: number) => string
  gradientId?: string
  className?: string
  /** Trend color. Defaults to the series direction (first → last). */
  tone?: "positive" | "negative"
  /** Fires with the hovered point index, or null when the cursor leaves. */
  onActiveIndexChange?: (index: number | null) => void
}

export function HeroAreaChart({
  data,
  activeRange,
  height = 240,
  formatValue = (value) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatYAxis = (value) => `$${Math.round(value)}`,
  gradientId = "heroAreaChartFill",
  className,
  tone,
  onActiveIndexChange,
}: HeroAreaChartProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  // Axis labels (both value and date/time) are intentionally hidden. The
  // formatter and active range stay in the prop contract for callers but no
  // longer drive any rendered ticks.
  void formatYAxis
  void activeRange

  const resolvedTone: "positive" | "negative" =
    tone ?? (data.length >= 2 && data[data.length - 1].value < data[0].value ? "negative" : "positive")
  const color = TONE_COLORS[resolvedTone]

  const yTickValues = useMemo(() => {
    if (isMobile || data.length === 0) {
      return []
    }

    const values = data.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const tickCount = 4

    if (min === max) {
      return [min]
    }

    const step = (max - min) / (tickCount - 1)
    return Array.from({ length: tickCount }, (_, index) => Math.round((min + step * index) * 100) / 100)
  }, [data, isMobile])

  const chartShellClassName =
    className ??
    "relative h-[210px] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] dark:bg-none sm:h-[240px]"

  return (
    <div className={chartShellClassName} style={height !== 240 ? { height } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: isMobile ? 8 : 16, bottom: 8, left: 0 }}
          onMouseMove={
            onActiveIndexChange
              ? (state: { activeTooltipIndex?: number; isTooltipActive?: boolean }) => {
                  onActiveIndexChange(state?.isTooltipActive ? state.activeTooltipIndex ?? null : null)
                }
              : undefined
          }
          onMouseLeave={onActiveIndexChange ? () => onActiveIndexChange(null) : undefined}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.fill} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color.fill} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          {/* Axis kept for the categorical scale, but its date/time labels are
              hidden for a clean, minimal chart. */}
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={false} height={0} />
          {/* No visible value labels: `tick={false}` + width 0 render nothing,
              while the axis still defines the domain padding / vertical scaling. */}
          <YAxis
            orientation="right"
            width={0}
            axisLine={false}
            tickLine={false}
            tick={false}
            ticks={yTickValues}
            domain={[(dataMin: number) => dataMin - 4, (dataMax: number) => dataMax + 4]}
          />
          <RechartsTooltip
            cursor={{ stroke: color.cursor, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as ChartPoint
                return (
                  <div className="rounded-xs border border-border bg-popover px-2.5 py-1.5 shadow-elev-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{point.label}</span>
                      <span className="font-data text-[12.5px] font-medium text-foreground">{formatValue(point.value)}</span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color.stroke}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={(props) => {
              const { cx, cy, index } = props
              if (index !== data.length - 1 || cx == null || cy == null) {
                return <g key={`hero-area-dot-${index ?? "placeholder"}`} />
              }
              return (
                <g key={`hero-area-dot-${index}`}>
                  <circle cx={cx} cy={cy} fill={color.stroke} opacity={0.45}>
                    <animate attributeName="r" values="5;18" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r={5.5} fill={color.stroke} stroke="hsl(var(--background))" strokeWidth={2.5} />
                </g>
              )
            }}
            activeDot={{ r: 5, fill: color.stroke, stroke: "hsl(var(--background))", strokeWidth: 2.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

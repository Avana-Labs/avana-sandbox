"use client"

import { useMemo } from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { getChartTickIndexes } from "./chart-data"
import type { ChartPoint, ChartRangeOption } from "./types"

const TONE_COLORS = {
  positive: { stroke: "#22C55E", fill: "#22C55E", cursor: "rgba(34, 197, 94, 0.2)" },
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

  const resolvedTone: "positive" | "negative" =
    tone ?? (data.length >= 2 && data[data.length - 1].value < data[0].value ? "negative" : "positive")
  const color = TONE_COLORS[resolvedTone]

  const xTickIndexes = useMemo(() => getChartTickIndexes(activeRange, data.length), [activeRange, data.length])

  // On mobile, thin the x-axis labels so they don't collide while keeping the middle ones
  // (first, two evenly spaced middles, last).
  const visibleXTicks = useMemo(() => {
    const maxTicks = 5
    if (!isMobile || xTickIndexes.length <= maxTicks) {
      return xTickIndexes
    }
    const step = (xTickIndexes.length - 1) / (maxTicks - 1)
    const picked = Array.from({ length: maxTicks }, (_, i) => xTickIndexes[Math.round(i * step)])
    return Array.from(new Set(picked))
  }, [isMobile, xTickIndexes])

  const chartShellClassName =
    className ??
    "relative h-[210px] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] dark:bg-none sm:h-[240px]"

  return (
    <div className={chartShellClassName} style={height !== 240 ? { height } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: isMobile ? 8 : 4, bottom: 20, left: 0 }}
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
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            ticks={visibleXTicks}
            interval={0}
            tick={(tickProps) => {
              const { x, y, payload } = tickProps
              const label = data[payload.value]?.label ?? ""
              const isFirst = payload.value === visibleXTicks[0]
              const isLast = payload.value === visibleXTicks[visibleXTicks.length - 1]
              const anchor = isFirst ? "start" : isLast ? "end" : "middle"
              return (
                <text x={x} y={y} dy={12} textAnchor={anchor} fill="hsl(var(--muted-foreground))" fontSize={11}>
                  {label}
                </text>
              )
            }}
          />
          <YAxis
            orientation="right"
            hide={isMobile}
            axisLine={false}
            tickLine={false}
            width={isMobile ? 0 : 52}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={formatYAxis}
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
                return null
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

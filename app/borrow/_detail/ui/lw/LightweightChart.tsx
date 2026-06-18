"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts"
import { useTheme } from "next-themes"
import type { Series, TimeRangeId } from "@/app/lib/borrow-detail"
import type { TokenChartHover } from "../TokenPriceChart"
import { makeChartPalette, type ThemeMode } from "@/app/lib/chart-colors"
import { useMediaQuery } from "@/app/lib/use-media-query"

export type LwChartType = "area" | "line" | "bar"

export type LwTooltipData = {
  time: string
  valueLabel: string
  seriesLabel: string
}

export type LightweightChartProps = {
  series: Series
  type?: LwChartType
  height?: number
  className?: string
  ariaLabel?: string
  /** Optional token/pool text class used to derive a themed chart accent. */
  accentClassName?: string | string[]
  /** Formats the hover value shown inside the floating tooltip. */
  formatValue?: (v: number) => string
  /** Formats the hover time label shown inside the tooltip. */
  formatTime?: (iso: string) => string
  /** When true the line/area is tinted with the rose palette (used for bad / debt series). */
  tone?: "neutral" | "positive" | "negative"
  /** When true, render a persistent "Today" value label at the last datapoint (Uniswap-style). */
  showLastLabel?: boolean
  /** Minimal grayscale styling used on token-style asset hero charts. */
  variant?: "default" | "token"
  /** When true, render a dot on the latest datapoint (token pages). */
  showEndDot?: boolean
  /** When set, hover updates the parent (e.g. hero price) and hides the floating tooltip. */
  onHoverChange?: (hover: TokenChartHover | null) => void
  /** Active range — used for token chart axis labels. */
  timeRange?: TimeRangeId
  /** Optional fixed visible price range for token hero charts. */
  priceRange?: { min: number; max: number }
}

export function LightweightChart({
  series,
  type = "area",
  height = 220,
  className,
  ariaLabel,
  accentClassName,
  formatValue = defaultFormat,
  formatTime = defaultFormatTime,
  tone = "neutral",
  showLastLabel = false,
  variant = "default",
  showEndDot = false,
  onHoverChange,
  timeRange,
  priceRange,
}: LightweightChartProps) {
  const isMobile = useMediaQuery("(max-width: 639px)")
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"

  const accentKey = Array.isArray(accentClassName) ? accentClassName.join("|") : accentClassName ?? ""
  void showLastLabel
  void showEndDot
  void timeRange
  void priceRange

  const data = React.useMemo(() => toChartRows(series.points), [series.points])
  const xTickIndexes = React.useMemo(() => pickTickIndexes(data.length, isMobile), [data.length, isMobile])
  const resolvedTone = tone === "neutral" ? resolveSeriesTone(data) : tone
  const palette = variant === "token" ? makeTokenChartPalette(theme) : makeChartPalette({ theme, tone: resolvedTone })

  const yTickValues = React.useMemo(() => {
    if (isMobile || data.length === 0) return []

    const values = data.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return [min]

    const tickCount = 4
    const step = (max - min) / (tickCount - 1)
    return Array.from({ length: tickCount }, (_, index) => Math.round((min + step * index) * 100) / 100)
  }, [data, isMobile])

  const chartShellClassName =
    className ??
    "relative h-[210px] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] dark:bg-none sm:h-[240px]"

  const ChartComponent = type === "bar" ? BarChart : type === "line" ? LineChart : AreaChart
  const lastPoint = data[data.length - 1]

  return (
    <div className={chartShellClassName} style={height !== 220 ? { height } : undefined} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{ top: 12, right: isMobile ? 8 : 4, bottom: 34, left: 0 }}
          onMouseMove={
            onHoverChange
              ? (state: { activeTooltipIndex?: number; isTooltipActive?: boolean }) => {
                  const index = state?.isTooltipActive ? state.activeTooltipIndex ?? null : null
                  if (index == null) {
                    onHoverChange(null)
                    return
                  }
                  const point = data[index]
                  if (!point) {
                    onHoverChange(null)
                    return
                  }
                  onHoverChange({ value: point.value, time: point.iso, index })
                }
              : undefined
          }
          onMouseLeave={() => {
            onHoverChange?.(null)
          }}
        >
          <defs>
            <linearGradient id={gradientId(series.id, accentKey)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.fillTop} stopOpacity={variant === "token" ? 0.18 : 1} />
              <stop offset="100%" stopColor={palette.fillBottom} stopOpacity={1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="idx"
            axisLine={false}
            tickLine={false}
            ticks={xTickIndexes}
            interval={0}
            tick={(tickProps) => {
              const { x, y, payload } = tickProps
              const index = Number(payload.value)
              const label = data[index]?.label ?? ""
              const isFirst = index === xTickIndexes[0]
              const isLast = index === xTickIndexes[xTickIndexes.length - 1]
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
            tickFormatter={formatValue}
            ticks={yTickValues}
            domain={[(dataMin: number) => dataMin - 4, (dataMax: number) => dataMax + 4]}
          />
          <RechartsTooltip
            cursor={{ stroke: palette.cursor, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload as ChartRow
                return (
                  <div className="rounded-xs border border-border bg-popover px-2.5 py-1.5 shadow-elev-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground">{formatTime(point.iso)}</span>
                      <span className="font-data text-[12.5px] font-medium text-foreground">{formatValue(point.value)}</span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />

          {type === "bar" ? (
            <Bar
              dataKey="value"
              fill={palette.stroke}
              radius={[3, 3, 0, 0]}
              barSize={10}
              isAnimationActive={false}
            />
          ) : type === "line" ? (
            <Line
              type="monotone"
              dataKey="value"
              stroke={palette.stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: palette.stroke, stroke: "hsl(var(--background))", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          ) : (
            <Area
              type="monotone"
              dataKey="value"
              stroke={palette.stroke}
              strokeWidth={2.5}
              fill={`url(#${gradientId(series.id, accentKey)})`}
              fillOpacity={1}
              dot={false}
              activeDot={{ r: 5, fill: palette.stroke, stroke: "hsl(var(--background))", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          )}
          {type !== "bar" && lastPoint ? (
            <>
              <ReferenceDot
                x={lastPoint.idx}
                y={lastPoint.value}
                isFront
                r={18}
                fill={palette.stroke}
                fillOpacity={0.12}
                stroke="none"
                shape={({ cx, cy }) => (
                  <g key="lw-endpoint-pulse">
                    <circle cx={cx} cy={cy} fill={palette.stroke} opacity={0.45}>
                      <animate attributeName="r" values="5;18" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              />
              <ReferenceDot
                x={lastPoint.idx}
                y={lastPoint.value}
                isFront
                r={5.5}
                fill={palette.stroke}
                stroke="hsl(var(--background))"
                strokeWidth={2.5}
              />
            </>
          ) : null}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}

type ChartRow = { idx: number; t: string; iso: string; label: string; value: number }

function toChartRows(points: Series["points"]): ChartRow[] {
  return [...points]
    .filter((point) => Number.isFinite(point.v))
    .sort((a, b) => (a.t > b.t ? 1 : a.t < b.t ? -1 : 0))
    .map((point, idx) => ({
      idx,
      t: point.t,
      iso: point.t,
      label: formatTick(point.t),
      value: point.v,
    }))
}

function pickTickIndexes(count: number, isMobile: boolean): number[] {
  if (count <= 0) return []
  const maxTicks = isMobile ? 5 : 7
  if (count <= maxTicks) return Array.from({ length: count }, (_, index) => index)

  const step = (count - 1) / (maxTicks - 1)
  const picked = Array.from({ length: maxTicks }, (_, i) => Math.round(i * step))
  return Array.from(new Set(picked))
}

function resolveSeriesTone(points: ChartRow[]): "positive" | "negative" {
  if (points.length < 2) return "positive"
  return points[points.length - 1].value >= points[0].value ? "positive" : "negative"
}

function formatTick(raw: string) {
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function defaultFormat(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(2)}K`
  return `$${v.toFixed(2)}`
}

function defaultFormatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function makeTokenChartPalette(theme: ThemeMode) {
  const stroke = theme === "dark" ? "#d4d4d8" : "#5F5F5C"
  return {
    accent: stroke,
    stroke,
    fillTop: theme === "dark" ? "rgba(212,212,216,0.1)" : "rgba(0,0,0,0.035)",
    fillBottom: "rgba(255,255,255,0)",
    cursor: theme === "dark" ? "rgba(212,212,216,0.2)" : "rgba(0,0,0,0.06)",
  }
}

function gradientId(seriesId: string, accentKey: string) {
  return `lw-chart-fill-${seriesId}-${accentKey}`.replace(/[^a-zA-Z0-9-]/g, "-")
}

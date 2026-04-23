"use client"

import * as React from "react"
import { MoreHorizontal, TrendingDown, TrendingUp, Users } from "lucide-react"
import { useTheme } from "next-themes"
import type { EngagementTrend } from "@/app/lib/borrow-detail"
import { resolveChartAccent, toRgba, type ThemeMode } from "@/app/lib/chart-colors"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
  engagement: EngagementTrend
  /** Optional token/pool class used to tint the chart accent. */
  accentClassName?: string | string[]
  /** Override the card title if the mock title isn't what you want. */
  title?: string
  className?: string
}

export function EngagementTrendsCard({ engagement, accentClassName, title, className }: Props) {
  const [hover, setHover] = React.useState<number | null>(null)
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"

  const values = engagement.series.points.map((p) => p.v)
  const hasData = values.some((v) => v > 0)

  const activeIndex = hover ?? Math.max(0, values.length - 1 - 5)
  const activePoint = engagement.series.points[activeIndex]

  const accent = resolveChartAccent({ theme, accentClassName })

  return (
    <Card className={cn("border-border/40 bg-card/50 p-5 shadow-none sm:p-6", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-[15px] font-medium text-foreground">
            {title ?? engagement.title}
          </h2>
        </div>
        <button
          type="button"
          aria-label="More options"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-[auto_1px_auto] items-start gap-x-6 gap-y-1">
        <Kpi label={engagement.primary.label} value={engagement.primary.valueLabel} delta={engagement.primary.delta} />
        <span aria-hidden className="h-10 self-center bg-border/60" />
        <Kpi label={engagement.secondary.label} value={engagement.secondary.valueLabel} delta={engagement.secondary.delta} />
      </div>

      <div className="mt-5">
        {hasData ? (
          <LineChart
            points={engagement.series.points}
            activeIndex={activeIndex}
            onHoverIndex={setHover}
            accent={accent}
            activeLabel={formatDateLabel(activePoint.t)}
            activeValue={activePoint.v.toLocaleString()}
          />
        ) : (
          <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">
            No engagement data available.
          </div>
        )}
      </div>
    </Card>
  )
}

function Kpi({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta: { value: number; direction: "up" | "down" | "flat"; label: string }
}) {
  const isUp = delta.direction === "up"
  const isDown = delta.direction === "down"
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-data text-2xl font-semibold tabular-nums text-foreground sm:text-[28px]">{value}</span>
        {delta.direction !== "flat" ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              isUp && "text-emerald-600 dark:text-emerald-400",
              isDown && "text-rose-600 dark:text-rose-400",
            )}
          >
            {isUp ? <TrendingUp className="h-3 w-3" aria-hidden /> : null}
            {isDown ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
            {delta.label.replace("+", "").replace("−", "")}
          </span>
        ) : null}
      </div>
    </div>
  )
}

type LineChartProps = {
  points: { t: string; v: number }[]
  activeIndex: number
  onHoverIndex: (i: number | null) => void
  accent: string
  activeLabel: string
  activeValue: string
}

function LineChart({ points, activeIndex, onHoverIndex, accent, activeLabel, activeValue }: LineChartProps) {
  const width = 860
  const height = 280
  const padTop = 16
  const padBottom = 32
  const padLeft = 40
  const padRight = 12
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const values = points.map((p) => p.v)
  const maxV = Math.max(...values, 1)
  const minV = 0
  const niceMax = niceCeil(maxV)
  const ticks = 6
  const gridVals = Array.from({ length: ticks }, (_, i) => (niceMax / (ticks - 1)) * i)

  const slot = chartW / Math.max(1, points.length - 1)
  const xForIndex = (i: number) => padLeft + slot * i
  const yForValue = (v: number) => padTop + chartH - ((v - minV) / (niceMax - minV)) * chartH

  const coords = points.map((p, i) => ({ x: xForIndex(i), y: yForValue(p.v) }))
  const linePath = smoothPath(coords)
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${padTop + chartH} Z`

  const gradId = React.useId()
  const accentStrong = toRgba(accent, 0.32)
  const accentSoft = toRgba(accent, 0)

  const activeX = coords[activeIndex].x
  const activeY = coords[activeIndex].y

  const tooltipW = 120
  const tooltipH = 54
  const tooltipX = Math.min(width - tooltipW - 4, Math.max(4, activeX - tooltipW / 2))
  const tooltipY = Math.max(4, activeY - tooltipH - 18)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      preserveAspectRatio="none"
      role="img"
      aria-label="Daily engagement"
      onMouseLeave={() => onHoverIndex(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentStrong} />
          <stop offset="100%" stopColor={accentSoft} />
        </linearGradient>
      </defs>

      {gridVals.map((v, i) => {
        const y = yForValue(v)
        return (
          <g key={i}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.12}
              className="text-muted-foreground"
            />
            <text x={padLeft - 10} y={y + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {formatAxisTick(v)}
            </text>
          </g>
        )
      })}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      <rect
        x={activeX - slot / 2}
        y={padTop}
        width={slot}
        height={chartH}
        fill={accent}
        opacity={0.06}
      />
      <line
        x1={activeX}
        y1={padTop}
        x2={activeX}
        y2={padTop + chartH}
        stroke={accent}
        strokeOpacity={0.35}
        strokeDasharray="2 3"
      />
      <circle cx={activeX} cy={activeY} r={5} fill={accent} stroke="white" strokeWidth={2} />

      {points.map((p, i) => (
        <rect
          key={i}
          x={xForIndex(i) - slot / 2}
          y={padTop}
          width={slot}
          height={chartH + padBottom}
          fill="transparent"
          onMouseEnter={() => onHoverIndex(i)}
        />
      ))}

      {points.map((p, i) => {
        const isActive = i === activeIndex
        return (
          <text
            key={i}
            x={xForIndex(i)}
            y={height - padBottom / 2 + 6}
            textAnchor="middle"
            className={cn(
              "text-[11px] tabular-nums",
              isActive ? "fill-foreground font-semibold" : "fill-muted-foreground",
            )}
          >
            {formatXTick(p.t)}
          </text>
        )
      })}

      <g transform={`translate(${tooltipX}, ${tooltipY})`}>
        <rect
          width={tooltipW}
          height={tooltipH}
          rx={10}
          ry={10}
          className="fill-background stroke-border/60"
          strokeWidth={1}
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" }}
        />
        <text x={tooltipW / 2} y={20} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          {activeLabel}
        </text>
        <text
          x={tooltipW / 2}
          y={40}
          textAnchor="middle"
          className="fill-foreground text-[14px] font-semibold tabular-nums"
        >
          {activeValue}
        </text>
      </g>
    </svg>
  )
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return ""
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`
  const tension = 0.2
  let d = `M ${coords[0].x} ${coords[0].y}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] ?? coords[i]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) * tension
    const c1y = p1.y + (p2.y - p0.y) * tension
    const c2x = p2.x - (p3.x - p1.x) * tension
    const c2y = p2.y - (p3.y - p1.y) * tension
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function niceCeil(v: number): number {
  if (v <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const bucket = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return bucket * pow
}

function formatAxisTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return `${Math.round(v)}`
}

function formatXTick(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

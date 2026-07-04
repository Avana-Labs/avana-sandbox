"use client"

import * as React from "react"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"
import type { Series } from "@/app/lib/borrow-detail"

export type TokenChartHover = {
  value: number
  time: string
  index: number
}

type TokenPriceChartProps = {
  series: Series
  height?: number
  className?: string
  ariaLabel?: string
  formatValue?: (v: number) => string
  onHoverChange?: (hover: TokenChartHover | null) => void
}

const CHART_RIGHT = 58
const CHART_BOTTOM = 28
const CHART_TOP = 8
const TICK_STEP = 25

export function TokenPriceChart({
  series,
  height = 280,
  className,
  ariaLabel,
  formatValue = defaultFormatValue,
  onHoverChange,
}: TokenPriceChartProps) {
  const { language } = useDisplayPreferences()
  const { ctx, convert } = useCurrency()
  const { t } = useTranslation()
  const locale = LANGUAGE_HTML_LANG[language] ?? "en"
  const width = 900
  const plotW = width - CHART_RIGHT
  const plotH = height - CHART_BOTTOM - CHART_TOP
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)

  const layout = React.useMemo(() => buildLayout(series.points, plotW, plotH, locale), [locale, series.points, plotW, plotH])
  const resolvedFormatValue = React.useCallback(
    (value: number) =>
      formatValue === defaultFormatValue
        ? new Intl.NumberFormat(locale, {
            style: "currency",
            currency: ctx.currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(convert(value))
        : formatValue(value),
    [convert, ctx.currency, formatValue, locale],
  )

  const activeIndex = hoverIndex ?? layout.points.length - 1
  React.useEffect(() => {
    if (!onHoverChange) return
    if (hoverIndex == null) {
      onHoverChange(null)
      return
    }
    const point = layout.points[hoverIndex]
    if (!point) {
      onHoverChange(null)
      return
    }
    onHoverChange({ value: point.v, time: point.t, index: hoverIndex })
  }, [hoverIndex, layout.points, onHoverChange])

  const handlePointer = React.useCallback(
    (clientX: number) => {
      const el = containerRef.current
      if (!el || layout.coords.length === 0) return
      const rect = el.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * plotW
      const idx = nearestIndex(x, layout.coords)
      setHoverIndex(idx)
    },
    [layout.coords, plotW],
  )

  if (layout.points.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-sm text-[#A3A3A3]", className)}
        style={{ height }}
        role="img"
        aria-label={ariaLabel ?? t("Price chart")}
      />
    )
  }

  const linePath = layout.coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")
  const areaPath = `${linePath} L${layout.coords[layout.coords.length - 1][0].toFixed(2)} ${plotH} L${layout.coords[0][0].toFixed(2)} ${plotH} Z`
  const [dotX, dotY] = layout.coords[activeIndex] ?? layout.coords[layout.coords.length - 1]
  const gradId = React.useId().replace(/:/g, "")

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full touch-none select-none", className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel ?? t("Price chart")}
      onPointerMove={(e) => handlePointer(e.clientX)}
      onPointerDown={(e) => handlePointer(e.clientX)}
      onPointerLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id={`token-fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B0B0B0" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
        </defs>

        <g transform={`translate(0 ${CHART_TOP})`}>
          {layout.yTicks.map((tick) => (
            <line
              key={tick.value}
              x1={0}
              x2={plotW}
              y1={tick.y}
              y2={tick.y}
              stroke="#EBEBEB"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          ))}

          <path d={areaPath} fill={`url(#token-fill-${gradId})`} />
          <path
            d={linePath}
            fill="none"
            stroke="#3A3A3A"
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {hoverIndex != null ? (
            <line x1={dotX} x2={dotX} y1={0} y2={plotH} stroke="#D4D4D4" strokeWidth={1} />
          ) : null}

          <circle cx={dotX} cy={dotY} r={3.5} fill="#3A3A3A" stroke="#FFFFFF" strokeWidth={2} />
        </g>

        <g transform={`translate(0 ${CHART_TOP})`}>
          {layout.yTicks.map((tick) => (
            <text
              key={`y-${tick.value}`}
              x={plotW + 8}
              y={tick.y + 3.5}
              fill="#B0B0B0"
              fontSize={10}
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            >
              {resolvedFormatValue(tick.value)}
            </text>
          ))}
        </g>

        <g transform={`translate(0 ${height - CHART_BOTTOM + 18})`}>
          {layout.xTicks.map((tick) => (
            <text
              key={tick.label}
              x={tick.x}
              y={0}
              fill="#B0B0B0"
              fontSize={10}
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              {tick.label}
            </text>
          ))}
        </g>
      </svg>

    </div>
  )
}

type LayoutPoint = { t: string; v: number }
type YTick = { value: number; y: number }
type XTick = { x: number; label: string }

function buildLayout(points: LayoutPoint[], plotW: number, plotH: number, locale: string) {
  const sorted = [...points]
    .filter((p) => Number.isFinite(p.v))
    .sort((a, b) => (a.t > b.t ? 1 : a.t < b.t ? -1 : 0))

  if (sorted.length === 0) {
    return { points: sorted, coords: [] as Array<[number, number]>, yTicks: [] as YTick[], xTicks: [] as XTick[] }
  }

  const values = sorted.map((p) => p.v)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const yMin = Math.floor((dataMin - TICK_STEP) / TICK_STEP) * TICK_STEP
  const yMax = Math.ceil((dataMax + 40) / TICK_STEP) * TICK_STEP
  const yRange = yMax - yMin || TICK_STEP

  const toY = (v: number) => plotH - ((v - yMin) / yRange) * plotH
  const stepX = plotW / Math.max(1, sorted.length - 1)
  const coords: Array<[number, number]> = sorted.map((p, i) => [i * stepX, toY(p.v)])

  const yTicks: YTick[] = []
  for (let v = yMin; v <= yMax; v += TICK_STEP) {
    yTicks.push({ value: v, y: toY(v) })
  }

  return { points: sorted, coords, yTicks, xTicks: pickXLabels(sorted, stepX, locale) }
}

function pickXLabels(points: LayoutPoint[], stepX: number, locale: string): XTick[] {
  const maxLabels = 7
  const count = points.length
  if (count <= maxLabels) {
    return points.map((p, i) => ({ x: i * stepX, label: formatAxisDate(p.t, locale) }))
  }
  const stride = Math.ceil((count - 1) / (maxLabels - 1))
  const ticks: XTick[] = []
  for (let i = 0; i < count; i += stride) {
    ticks.push({ x: i * stepX, label: formatAxisDate(points[i].t, locale) })
  }
  const last = count - 1
  if (ticks[ticks.length - 1]?.x !== last * stepX) {
    ticks.push({ x: last * stepX, label: formatAxisDate(points[last].t, locale) })
  }
  return ticks
}

function nearestIndex(x: number, coords: Array<[number, number]>) {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < coords.length; i++) {
    const dist = Math.abs(coords[i][0] - x)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

function formatAxisDate(raw: string, locale: string) {
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

function defaultFormatValue(v: number) {
  // Sentinel default: when a caller doesn't pass `formatValue`, the component's
  // `resolvedFormatValue` uses the locale-aware active-currency Intl path instead.
  // Route this fallback through the shared active-currency formatter so it never
  // hardcodes USD if it is ever rendered directly.
  return formatUsdExact(v)
}

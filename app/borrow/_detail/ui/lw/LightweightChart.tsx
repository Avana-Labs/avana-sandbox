"use client"

import * as React from "react"
import { useTheme } from "@/app/components/theme-provider"
import { useLocaleDisplayPreferences } from "@/app/components/display-preferences"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { useCurrency } from "@/app/lib/currency/use-currency"
import type { Series, TimeRangeId } from "@/app/lib/borrow-detail"
import type { TokenChartHover } from "../TokenPriceChart"
import { makeChartPalette, type ThemeMode } from "@/app/lib/chart-colors"
import { LANGUAGE_HTML_LANG } from "@/app/lib/i18n/language-html-lang"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  accentClassName?: string | string[]
  formatValue?: (v: number) => string
  formatTime?: (iso: string) => string
  tone?: "neutral" | "positive" | "negative"
  showLastLabel?: boolean
  variant?: "default" | "token"
  showEndDot?: boolean
  onHoverChange?: (hover: TokenChartHover | null) => void
  timeRange?: TimeRangeId
  priceRange?: { min: number; max: number }
}

type ChartRow = { idx: number; t: string; iso: string; label: string; value: number }
type PlotPoint = ChartRow & { x: number; y: number }

export function buildLightweightChartGeometry(
  data: ChartRow[],
  width: number,
  height: number,
  isMobile: boolean,
  priceRange?: { min: number; max: number },
) {
  const top = 12
  const bottom = 34
  const right = isMobile ? 8 : 56
  const plotWidth = Math.max(1, width - right)
  const plotBottom = Math.max(top + 1, height - bottom)
  const values = data.map((point) => point.value)
  const observedMin = values.length ? Math.min(...values) : 0
  const observedMax = values.length ? Math.max(...values) : 1
  const min = priceRange?.min ?? observedMin - 4
  const max = priceRange?.max ?? observedMax + 4
  const range = Math.max(0.000001, max - min)
  const points: PlotPoint[] = data.map((point, index) => ({
    ...point,
    x: data.length === 1 ? plotWidth / 2 : (index / Math.max(1, data.length - 1)) * plotWidth,
    y: top + ((max - point.value) / range) * (plotBottom - top),
  }))
  const linePath = monotoneLinePath(points)
  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`
    : ""

  return { points, linePath, areaPath, min, max, plotBottom, plotWidth }
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
  const shellRef = React.useRef<HTMLDivElement | null>(null)
  const isMobile = useMediaQuery("(max-width: 639px)")
  const { resolvedTheme } = useTheme()
  const { language } = useLocaleDisplayPreferences()
  const { ctx, convert } = useCurrency()
  const { t } = useTranslation()
  const locale = LANGUAGE_HTML_LANG[language] ?? "en"
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"
  const [dimensions, setDimensions] = React.useState({ width: 900, height })
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const [isVisible, setIsVisible] = React.useState(true)
  const accentKey = Array.isArray(accentClassName) ? accentClassName.join("|") : accentClassName ?? ""
  void showLastLabel
  void showEndDot
  void timeRange

  React.useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const next = {
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height)),
      }
      setDimensions((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      )
    })
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)))
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  const data = React.useMemo(() => toChartRows(series.points, locale), [locale, series.points])
  const xTickIndexes = React.useMemo(() => pickTickIndexes(data.length, isMobile), [data.length, isMobile])
  const resolvedTone = tone === "neutral" ? resolveSeriesTone(data) : tone
  const palette = variant === "token" ? makeTokenChartPalette(theme) : makeChartPalette({ theme, tone: resolvedTone })
  const resolvedFormatValue = React.useCallback(
    (value: number) =>
      formatValue === defaultFormat
        ? formatCompactCurrencyValue(convert(value), ctx.currency, locale)
        : formatValue(value),
    [convert, ctx.currency, formatValue, locale],
  )
  const resolvedFormatTime = React.useCallback(
    (iso: string) => (formatTime === defaultFormatTime ? defaultFormatTime(iso, locale) : formatTime(iso)),
    [formatTime, locale],
  )
  const geometry = React.useMemo(
    () => buildLightweightChartGeometry(data, dimensions.width, dimensions.height, isMobile, priceRange),
    [data, dimensions, isMobile, priceRange],
  )
  const yTickValues = React.useMemo(() => {
    if (isMobile || data.length === 0) return []
    if (geometry.min === geometry.max) return [geometry.min]
    return Array.from({ length: 4 }, (_, index) => geometry.min + ((geometry.max - geometry.min) * index) / 3)
  }, [data.length, geometry.max, geometry.min, isMobile])
  const activePoint = activeIndex == null ? null : geometry.points[activeIndex]
  const lastPoint = geometry.points[geometry.points.length - 1]
  const id = gradientId(series.id, accentKey)
  const chartShellClassName =
    className ??
    "relative h-[210px] bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px] dark:bg-none sm:h-[240px]"

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (data.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
    const index = Math.round(ratio * (data.length - 1))
    setActiveIndex(index)
    const point = data[index]
    onHoverChange?.({ value: point.value, time: point.iso, index })
  }
  const clearPointer = () => {
    setActiveIndex(null)
    onHoverChange?.(null)
  }

  return (
    <div
      ref={shellRef}
      className={chartShellClassName}
      style={height !== 220 ? { height } : undefined}
      role="img"
      aria-label={ariaLabel ?? t("Price chart")}
      onPointerMove={updatePointer}
      onPointerLeave={clearPointer}
      data-testid="lightweight-chart"
    >
      <svg className="size-full overflow-visible" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.fillTop} stopOpacity={variant === "token" ? 0.18 : 1} />
            <stop offset="100%" stopColor={palette.fillBottom} stopOpacity={1} />
          </linearGradient>
        </defs>

        {type === "area" && geometry.areaPath ? <path d={geometry.areaPath} fill={`url(#${id})`} /> : null}
        {type === "bar"
          ? geometry.points.map((point) => {
              const barWidth = Math.min(10, Math.max(2, geometry.plotWidth / Math.max(1, data.length) * 0.6))
              return (
                <rect
                  key={point.iso}
                  x={point.x - barWidth / 2}
                  y={point.y}
                  width={barWidth}
                  height={Math.max(1, geometry.plotBottom - point.y)}
                  rx={3}
                  fill={palette.stroke}
                />
              )
            })
          : geometry.linePath
            ? <path d={geometry.linePath} fill="none" stroke={palette.stroke} strokeWidth="2.5" />
            : null}

        {xTickIndexes.map((index, tickIndex) => {
          const point = geometry.points[index]
          if (!point) return null
          const anchor = tickIndex === 0 ? "start" : tickIndex === xTickIndexes.length - 1 ? "end" : "middle"
          return <text key={point.iso} x={point.x} y={dimensions.height - 8} textAnchor={anchor} fill="hsl(var(--muted-foreground))" fontSize="11">{point.label}</text>
        })}
        {yTickValues.map((value) => {
          const y = 12 + ((geometry.max - value) / Math.max(0.000001, geometry.max - geometry.min)) * (geometry.plotBottom - 12)
          return <text key={value} x={dimensions.width - 2} y={y + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize="11">{resolvedFormatValue(value)}</text>
        })}

        {activePoint ? (
          <>
            <line x1={activePoint.x} x2={activePoint.x} y1="12" y2={geometry.plotBottom} stroke={palette.cursor} />
            {type !== "bar" ? <circle cx={activePoint.x} cy={activePoint.y} r="5" fill={palette.stroke} stroke="hsl(var(--background))" strokeWidth="2.5" /> : null}
          </>
        ) : null}
        {type !== "bar" && lastPoint ? (
          <>
            {isVisible ? (
              <circle cx={lastPoint.x} cy={lastPoint.y} fill={palette.stroke} opacity="0.45">
                <animate attributeName="r" values="5;18" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
            ) : null}
            <circle cx={lastPoint.x} cy={lastPoint.y} r="5.5" fill={palette.stroke} stroke="hsl(var(--background))" strokeWidth="2.5" />
          </>
        ) : null}
      </svg>

      {activePoint && !onHoverChange ? (
        <div
          className="pointer-events-none absolute top-2 rounded-xs border border-border bg-popover px-2.5 py-1.5 shadow-elev-2"
          style={{ left: `${Math.min(88, Math.max(2, (activePoint.x / dimensions.width) * 100))}%`, transform: "translateX(-50%)" }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">{resolvedFormatTime(activePoint.iso)}</span>
            <span className="font-data text-[12.5px] font-medium text-foreground">{resolvedFormatValue(activePoint.value)}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function monotoneLinePath(points: PlotPoint[]) {
  if (points.length === 0) return ""
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  const slopes = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1]
    return (next.y - point.y) / Math.max(1, next.x - point.x)
  })
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0]
    if (index === points.length - 1) return slopes[slopes.length - 1]
    const previous = slopes[index - 1]
    const next = slopes[index]
    if (previous === 0 || next === 0 || Math.sign(previous) !== Math.sign(next)) return 0
    return (2 * previous * next) / (previous + next)
  })
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index]
    const next = points[index + 1]
    const third = (next.x - point.x) / 3
    path += ` C ${point.x + third} ${point.y + tangents[index] * third}, ${next.x - third} ${next.y - tangents[index + 1] * third}, ${next.x} ${next.y}`
  }
  return path
}

function toChartRows(points: Series["points"], locale: string): ChartRow[] {
  return [...points]
    .filter((point) => Number.isFinite(point.v))
    .sort((a, b) => (a.t > b.t ? 1 : a.t < b.t ? -1 : 0))
    .map((point, idx) => ({ idx, t: point.t, iso: point.t, label: formatTick(point.t, locale), value: point.v }))
}

function pickTickIndexes(count: number, isMobile: boolean): number[] {
  if (count <= 0) return []
  const maxTicks = isMobile ? 5 : 7
  if (count <= maxTicks) return Array.from({ length: count }, (_, index) => index)
  const step = (count - 1) / (maxTicks - 1)
  return Array.from(new Set(Array.from({ length: maxTicks }, (_, index) => Math.round(index * step))))
}

function resolveSeriesTone(points: ChartRow[]): "positive" | "negative" {
  if (points.length < 2) return "positive"
  return points[points.length - 1].value >= points[0].value ? "positive" : "negative"
}

function formatTick(raw: string, locale: string) {
  const date = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" })
}

function defaultFormat(value: number): string {
  return formatCompactUsd(value)
}

function defaultFormatTime(iso: string, locale?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })
}

function formatCompactCurrencyValue(value: number, currency: string, locale: string): string {
  if (Math.abs(value) >= 1_000) {
    return new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(value)
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
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

"use client"

import * as React from "react"
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
} from "lightweight-charts"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import type { Series, TimeRangeId } from "@/app/lib/borrow-detail"
import type { TokenChartHover } from "../TokenPriceChart"
import { makeChartPalette, type ThemeMode } from "@/app/lib/chart-colors"

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

/**
 * Thin wrapper around TradingView's Lightweight Charts. Keeps the chart itself
 * lean (one series, no legend, no grid) so the surrounding SectionCard can own
 * layout, titles and toolbars. Lazy-imports the library so it never ships to
 * the RSC pass, and falls back to an empty container while it loads.
 */
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
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement | null>(null)
  const lastLabelRef = React.useRef<HTMLDivElement | null>(null)
  const lastDotRef = React.useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = React.useState<LwTooltipData | null>(null)
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"
  const accentKey = Array.isArray(accentClassName) ? accentClassName.join("|") : accentClassName ?? ""
  const chartRangeKey = priceRange ? `${timeRange ?? ""}:${priceRange.min}:${priceRange.max}` : (timeRange ?? "")
  const usesCustomTokenAxes = variant === "token" && !!priceRange
  const tokenAxisColor = theme === "dark" ? "#a1a1aa" : "#A8A8A8"
  const bottomAxisTicks = React.useMemo(
    () => (usesCustomTokenAxes ? buildBottomAxisTicks(series.points, timeRange) : []),
    [usesCustomTokenAxes, series.points, timeRange],
  )

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const styles = getComputedStyle(container)
    const mf = (styles.getPropertyValue("--muted-foreground") || "150 8% 42%").trim()
    const mfColor = (alpha = 1) => (alpha === 1 ? `hsl(${mf})` : `hsl(${mf} / ${alpha})`)
    const palette =
      variant === "token"
        ? makeTokenChartPalette(theme)
        : makeChartPalette({ accentClassName, tone, theme })
    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: usesCustomTokenAxes ? "transparent" : variant === "token" ? tokenAxisColor : mfColor(),
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: variant === "token" ? 13 : 11,
        attributionLogo: false,
      },
      rightPriceScale: {
        visible: !usesCustomTokenAxes,
        borderVisible: false,
        scaleMargins: { top: variant === "token" ? 0.08 : 0.18, bottom: variant === "token" ? 0.1 : 0.1 },
        ...(variant === "token"
          ? {
              tickMarkDensity: 8,
              ensureEdgeTickMarksVisible: true,
            }
          : {}),
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: variant !== "token",
        fixRightEdge: variant !== "token",
        rightOffset: variant === "token" ? 2 : 0,
        ticksVisible: variant === "token" && !usesCustomTokenAxes,
        ...(variant === "token" && !usesCustomTokenAxes
          ? {
              tickMarkFormatter: (time: unknown) => formatTokenTick(time, timeRange),
            }
          : {}),
      },
      grid: {
        vertLines: { visible: false },
        horzLines: {
          visible: true,
          color: variant === "token" ? "rgba(0,0,0,0.055)" : mfColor(0.08),
          style: variant === "token" ? LineStyle.Dotted : LineStyle.Solid,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: variant === "token" ? "#E0E0E0" : palette.cursor,
          width: 1,
          style: LineStyle.Solid,
          labelVisible: false,
        },
        horzLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    })

    const definition = type === "bar" ? HistogramSeries : type === "line" ? LineSeries : AreaSeries
    const customPriceFormat = {
      type: "custom" as const,
      formatter: (v: number) => formatValue(v),
      minMove: variant === "token" ? 20 : 0.0001,
    }
    const seriesOptions =
      type === "bar"
        ? {
            color: palette.stroke,
            priceFormat: customPriceFormat,
            priceLineVisible: false,
            lastValueVisible: false,
          }
        : type === "line"
          ? {
              color: palette.stroke,
              lineWidth: 2 as const,
              priceLineVisible: false,
              lastValueVisible: variant !== "token",
              priceFormat: customPriceFormat,
            }
          : {
              lineColor: palette.stroke,
              topColor: palette.fillTop,
              bottomColor: palette.fillBottom,
              lineWidth: 2 as const,
              priceLineVisible: false,
              lastValueVisible: false,
              priceFormat: customPriceFormat,
            }

    const mainSeries = chart.addSeries(definition as never, seriesOptions as never)
    const data = toChartData(series, type)
    mainSeries.setData(data as never)
    chart.timeScale().fitContent()
    if (variant === "token" && priceRange) {
      const priceScale = chart.priceScale("right") as unknown as {
        setAutoScale?: (on: boolean) => void
        setVisibleRange?: (range: { from: number; to: number }) => void
      }
      priceScale.setAutoScale?.(false)
      priceScale.setVisibleRange?.({ from: priceRange.min, to: priceRange.max })
    }

    const lastPoint = data[data.length - 1]
    let hoverActive = false

    const syncLastLabel = () => {
      if ((!showLastLabel && !showEndDot) || !lastPoint || !lastDotRef.current) return
      if (hoverActive && onHoverChange) return
      if (showLastLabel && !lastLabelRef.current) return
      const ts = chart.timeScale() as unknown as {
        timeToCoordinate?: (t: never) => number | null
      }
      const ps = mainSeries as unknown as {
        priceToCoordinate?: (v: number) => number | null
      }
      if (typeof ts.timeToCoordinate !== "function" || typeof ps.priceToCoordinate !== "function") {
        return
      }
      const x = ts.timeToCoordinate(lastPoint.time as never)
      const y = ps.priceToCoordinate(lastPoint.value)
      const dot = lastDotRef.current
      if (x == null || y == null) {
        if (lastLabelRef.current) lastLabelRef.current.style.opacity = "0"
        dot.style.opacity = "0"
        return
      }
      if (variant === "token" && showEndDot) {
        dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`
      } else {
        dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`
      }
      dot.style.opacity = "1"
      if (showLastLabel && lastLabelRef.current) {
        const label = lastLabelRef.current
        const w = label.offsetWidth || 72
        const h = label.offsetHeight || 36
        const pad = 10
        const maxX = (containerRef.current?.clientWidth ?? 0) - w - pad
        const labelX = Math.min(Math.max(pad, x - w / 2), maxX)
        const labelY = Math.max(pad, y - h - 14)
        label.style.transform = `translate(${labelX}px, ${labelY}px)`
        label.style.opacity = "1"
      }
    }

    const handleResize = () => {
      if (!containerRef.current) return
      chart.resize(containerRef.current.clientWidth, height)
      requestAnimationFrame(syncLastLabel)
    }
    window.addEventListener("resize", handleResize)
    chart.timeScale().subscribeVisibleTimeRangeChange(syncLastLabel)
    requestAnimationFrame(syncLastLabel)
    const rafId = requestAnimationFrame(() => requestAnimationFrame(syncLastLabel))

    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        hoverActive = false
        setHover(null)
        onHoverChange?.(null)
        requestAnimationFrame(syncLastLabel)
        return
      }
      const price = param.seriesData.get(mainSeries as never) as
        | { value?: number; close?: number }
        | undefined
      const value = price?.value ?? price?.close
      if (value === undefined) {
        hoverActive = false
        setHover(null)
        onHoverChange?.(null)
        requestAnimationFrame(syncLastLabel)
        return
      }
      const timeIso = timeToIso(param.time as unknown)
      if (onHoverChange) {
        hoverActive = true
        onHoverChange({ value, time: timeIso, index: -1 })
        setHover(null)
        if (showEndDot && lastDotRef.current) {
          lastDotRef.current.style.transform = `translate(${param.point.x - 4}px, ${param.point.y - 4}px)`
          lastDotRef.current.style.opacity = "1"
        }
        return
      }
      setHover({
        time: formatTime(timeIso),
        valueLabel: formatValue(value),
        seriesLabel: series.label,
      })
      positionTooltip(tooltipRef.current, containerRef.current, param.point)
    })

    return () => {
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(rafId)
      chart.remove()
    }
  }, [series, type, height, tone, accentKey, formatValue, formatTime, theme, showLastLabel, showEndDot, variant, onHoverChange, chartRangeKey])

  return (
    <div
      className={cn("relative w-full", className)}
      role="img"
      aria-label={ariaLabel ?? `${series.label} chart`}
      style={{ height }}
    >
      <div
        ref={containerRef}
        className={cn("absolute inset-0", usesCustomTokenAxes ? "bottom-10 right-16" : undefined)}
        data-testid="lw-chart"
      />
      {usesCustomTokenAxes ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-9 z-[7] w-14 bg-gradient-to-r from-background via-background/90 to-transparent"
        />
      ) : null}
      {showLastLabel || showEndDot ? (
        <>
          <div
            ref={lastDotRef}
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-0 size-2 rounded-full opacity-0 transition-opacity",
              variant === "token"
                ? "bg-[#5F5F5C] shadow-[0_0_0_8px_rgba(0,0,0,0.045),0_0_0_3px_rgba(255,255,255,1)]"
                : "shadow-[0_0_0_3px_rgba(255,255,255,0.85)]",
            )}
            style={variant === "token" ? undefined : { backgroundColor: "currentColor", color: "hsl(var(--foreground))" }}
            data-testid="lw-last-dot"
          />
          {showLastLabel ? (
            <div
              ref={lastLabelRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-[5] rounded-md border border-border/60 bg-background/95 px-2 py-1 text-center text-[10px] font-medium opacity-0 shadow-sm backdrop-blur transition-opacity"
              data-testid="lw-last-label"
            >
              <div className="uppercase tracking-wider text-muted-foreground">Today</div>
              <div className="font-data text-[12px] font-semibold tabular-nums text-foreground">
                {formatValue(series.points[series.points.length - 1]?.v ?? 0)}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      {usesCustomTokenAxes ? (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[6] w-16">
          {buildFixedAxisTicks(priceRange.min, priceRange.max, 40).map((tick) => (
            <div
              key={tick.value}
              className="absolute right-0 translate-y-[-50%] text-right text-[11px] font-normal leading-none text-[#A8A8A8]"
              style={{ top: `${tick.y}%` }}
            >
              {formatValue(tick.value)}
            </div>
          ))}
        </div>
      ) : null}
      {usesCustomTokenAxes ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 right-16 z-[6] h-9">
          {bottomAxisTicks.map((tick) => (
            <div
              key={`${tick.label}-${tick.left}`}
              className="absolute bottom-0 translate-x-[-50%] text-[11px] font-normal leading-none text-[#A8A8A8]"
              style={{ left: `${tick.left}%` }}
            >
              {tick.label}
            </div>
          ))}
        </div>
      ) : null}
      {onHoverChange ? null : (
        <div
          ref={tooltipRef}
          role="tooltip"
          aria-hidden={!hover}
          className={cn(
            "pointer-events-none absolute z-10 min-w-[120px] rounded-lg border border-border/60 bg-popover/95 px-2.5 py-1.5 text-xs shadow-md backdrop-blur transition-opacity",
            hover ? "opacity-100" : "opacity-0",
          )}
          style={{ left: 0, top: 0 }}
        >
          {hover ? (
            <>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{hover.time}</div>
              <div className="mt-0.5 font-data text-sm font-semibold tabular-nums text-foreground">
                {hover.valueLabel}
              </div>
              <div className="text-[10px] text-muted-foreground">{hover.seriesLabel}</div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function toChartData(series: Series, type: LwChartType) {
  const intraday = series.points.some((p) => p.t.includes("T"))
  const deduped = new Map<number | string, number>()
  for (const point of series.points) {
    if (!Number.isFinite(point.v)) continue
    deduped.set(toLwTime(point.t, intraday), point.v)
  }

  return [...deduped.entries()]
    .sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0))
    .map(([time, value]) => (type === "bar" ? { time, value, color: undefined } : { time, value }))
}

function toLwTime(raw: string, intraday: boolean): number | string {
  if (!intraday && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return raw
  return intraday ? Math.floor(d.getTime() / 1000) : d.toISOString().slice(0, 10)
}

function timeToIso(t: unknown): string {
  if (typeof t === "string") return t
  if (typeof t === "number") return new Date(t * 1000).toISOString()
  if (t && typeof t === "object" && "year" in t && "month" in t && "day" in t) {
    const tt = t as { year: number; month: number; day: number }
    const d = new Date(Date.UTC(tt.year, tt.month - 1, tt.day))
    return d.toISOString()
  }
  return String(t)
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

function buildFixedAxisTicks(min: number, max: number, step: number) {
  const ticks: Array<{ value: number; y: number }> = []
  const span = max - min || step
  const topInset = 12
  const bottomInset = 14
  const usableHeight = 100 - topInset - bottomInset
  for (let value = min; value <= max; value += step) {
    const ratio = (max - value) / span
    ticks.push({ value, y: topInset + ratio * usableHeight })
  }
  return ticks
}

function buildBottomAxisTicks(points: Series["points"], range?: TimeRangeId) {
  const sorted = [...points]
    .filter((point) => point.t)
    .sort((a, b) => (a.t > b.t ? 1 : a.t < b.t ? -1 : 0))
  if (!sorted.length) return []

  const labels = new Map<string, string>()
  for (const point of sorted) {
    const iso = point.t.includes("T") ? point.t.slice(0, 10) : point.t
    if (!labels.has(iso)) labels.set(iso, formatTokenTick(iso, range))
  }

  const unique = [...labels.entries()]
  const trimmed = unique.length > 2 ? unique.slice(1, -1) : []
  return trimmed.map(([iso, label], index) => ({
    iso,
    label,
    left: (index + 1) * (100 / (trimmed.length + 1)),
  }))
}

function formatTokenTick(time: unknown, range?: TimeRangeId) {
  const iso = timeToIso(time)
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  if (range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }
  if (range === "1W" || range === "1M") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function positionTooltip(tooltip: HTMLDivElement | null, container: HTMLDivElement | null, point: { x: number; y: number }) {
  if (!tooltip || !container) return
  const pad = 8
  const maxX = container.clientWidth - tooltip.clientWidth - pad
  const maxY = container.clientHeight - tooltip.clientHeight - pad
  const x = Math.max(pad, Math.min(point.x + 12, maxX))
  const y = Math.max(pad, Math.min(point.y - tooltip.clientHeight - 8, maxY))
  tooltip.style.transform = `translate(${x}px, ${y}px)`
}

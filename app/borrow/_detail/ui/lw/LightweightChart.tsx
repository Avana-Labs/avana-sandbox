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
import type { Series } from "@/app/lib/borrow-detail"
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
}: LightweightChartProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const tooltipRef = React.useRef<HTMLDivElement | null>(null)
  const lastLabelRef = React.useRef<HTMLDivElement | null>(null)
  const lastDotRef = React.useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = React.useState<LwTooltipData | null>(null)
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"
  const accentKey = Array.isArray(accentClassName) ? accentClassName.join("|") : accentClassName ?? ""

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const styles = getComputedStyle(container)
    const mf = (styles.getPropertyValue("--muted-foreground") || "150 8% 42%").trim()
    const mfColor = (alpha = 1) => (alpha === 1 ? `hsl(${mf})` : `hsl(${mf} / ${alpha})`)
    const palette = makeChartPalette({ accentClassName, tone, theme })

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: mfColor(),
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      rightPriceScale: { visible: false, borderVisible: false, scaleMargins: { top: 0.2, bottom: 0.08 } },
      leftPriceScale: { visible: false },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: palette.cursor, width: 1, style: LineStyle.Solid, labelVisible: false },
        horzLine: { visible: false },
      },
      handleScale: false,
      handleScroll: false,
    })

    const definition = type === "bar" ? HistogramSeries : type === "line" ? LineSeries : AreaSeries
    const customPriceFormat = {
      type: "custom" as const,
      formatter: (v: number) => formatValue(v),
      minMove: 0.0001,
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
              lastValueVisible: true,
              priceFormat: customPriceFormat,
            }
          : {
              lineColor: palette.stroke,
              topColor: palette.fillTop,
              bottomColor: palette.fillBottom,
              lineWidth: 2 as const,
              priceLineVisible: false,
              lastValueVisible: true,
              priceFormat: customPriceFormat,
            }

    const mainSeries = chart.addSeries(definition as never, seriesOptions as never)
    const data = toChartData(series, type)
    mainSeries.setData(data)
    chart.timeScale().fitContent()

    const lastPoint = data[data.length - 1]

    const syncLastLabel = () => {
      if (!showLastLabel || !lastPoint || !lastLabelRef.current || !lastDotRef.current) return
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
      const label = lastLabelRef.current
      const dot = lastDotRef.current
      if (x == null || y == null) {
        label.style.opacity = "0"
        dot.style.opacity = "0"
        return
      }
      dot.style.transform = `translate(${x - 4}px, ${y - 4}px)`
      dot.style.opacity = "1"
      const w = label.offsetWidth || 72
      const h = label.offsetHeight || 36
      const pad = 10
      const maxX = (containerRef.current?.clientWidth ?? 0) - w - pad
      const labelX = Math.min(Math.max(pad, x - w / 2), maxX)
      const labelY = Math.max(pad, y - h - 14)
      label.style.transform = `translate(${labelX}px, ${labelY}px)`
      label.style.opacity = "1"
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
        setHover(null)
        return
      }
      const price = param.seriesData.get(mainSeries as never) as
        | { value?: number; close?: number }
        | undefined
      const value = price?.value ?? price?.close
      if (value === undefined) {
        setHover(null)
        return
      }
      const timeIso = timeToIso(param.time as unknown)
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
  }, [series, type, height, tone, accentKey, formatValue, formatTime, theme, showLastLabel])

  return (
    <div
      className={cn("relative w-full", className)}
      role="img"
      aria-label={ariaLabel ?? `${series.label} chart`}
      style={{ height }}
    >
      <div ref={containerRef} className="absolute inset-0" data-testid="lw-chart" />
      {showLastLabel ? (
        <>
          <div
            ref={lastDotRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 size-2 rounded-full opacity-0 shadow-[0_0_0_3px_rgba(255,255,255,0.85)] transition-opacity"
            style={{ backgroundColor: "currentColor", color: "hsl(var(--foreground))" }}
            data-testid="lw-last-dot"
          />
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
        </>
      ) : null}
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
    </div>
  )
}

function toChartData(series: Series, type: LwChartType) {
  return series.points
    .map((p) => ({ time: toLwTime(p.t), value: p.v }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0))
    .map((p) => (type === "bar" ? { time: p.time, value: p.value, color: undefined } : { time: p.time, value: p.value }))
}

function toLwTime(raw: string): string {
  // Accept both ISO date (YYYY-MM-DD) and full ISO timestamp. Lightweight
  // charts accepts business-day string when using the default time scale.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toISOString().slice(0, 10)
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

function positionTooltip(tooltip: HTMLDivElement | null, container: HTMLDivElement | null, point: { x: number; y: number }) {
  if (!tooltip || !container) return
  const pad = 8
  const maxX = container.clientWidth - tooltip.clientWidth - pad
  const maxY = container.clientHeight - tooltip.clientHeight - pad
  const x = Math.max(pad, Math.min(point.x + 12, maxX))
  const y = Math.max(pad, Math.min(point.y - tooltip.clientHeight - 8, maxY))
  tooltip.style.transform = `translate(${x}px, ${y}px)`
}

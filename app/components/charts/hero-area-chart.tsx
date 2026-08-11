"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react"
import { getChartTickIndexes } from "./chart-data"
import type { ChartPoint, ChartRangeOption } from "./types"

const TONE_COLORS = {
  positive: {
    stroke: "#01AACF",
    fill: "#01AACF",
    cursor: "rgba(1, 170, 207, 0.2)",
  },
  negative: {
    stroke: "#F0444C",
    fill: "#F0444C",
    cursor: "rgba(240, 68, 76, 0.2)",
  },
  neutral: {
    stroke: "hsl(var(--foreground))",
    fill: "hsl(var(--foreground))",
    cursor: "hsl(var(--foreground) / 0.18)",
  },
} as const

type HeroAreaChartProps = {
  data: ChartPoint[]
  activeRange: ChartRangeOption
  height?: number
  formatValue?: (value: number) => string
  formatYAxis?: (value: number) => string
  gradientId?: string
  className?: string
  tone?: "positive" | "negative" | "neutral"
  onActiveIndexChange?: (index: number | null) => void
}

type PlotPoint = ChartPoint & { x: number; y: number }
type AxisTick = { value: number; y: number; label: string }
type XAxisTick = { x: number; label: string; anchor: "start" | "middle" | "end" }

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

export function buildHeroAreaGeometry(
  data: ChartPoint[],
  width: number,
  height: number,
  activeRange: ChartRangeOption = "1D",
  formatYAxis: (value: number) => string = (value) => String(Math.round(value)),
) {
  if (data.length === 0) {
    return {
      points: [] as PlotPoint[],
      linePath: "",
      areaPath: "",
      axisTicks: [] as AxisTick[],
      xAxisTicks: [] as XAxisTick[],
    }
  }
  const top = 58
  const bottom = 34
  const right = width < 640 ? 40 : 48
  const values = data.map((point) => point.value)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const valueSpan = Math.max(1, rawMax - rawMin)
  const min = rawMin - Math.max(4, valueSpan * 0.08)
  const max = rawMax + Math.max(4, valueSpan * 0.28)
  const range = Math.max(1, max - min)
  const plotHeight = Math.max(1, height - top - bottom)
  const plotWidth = Math.max(1, width - right)
  const yTickCount = width < 640 ? 5 : 6
  const tickValues = Array.from({ length: yTickCount }, (_, index) => max - (range * index) / (yTickCount - 1))
  const axisTicks = tickValues.map((value) => ({
    value,
    y: top + ((max - value) / range) * plotHeight,
    label: formatYAxis(value),
  }))
  const points = data.map((point, index) => ({
    ...point,
    x: data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth,
    y: top + ((max - point.value) / range) * plotHeight,
  }))
  const rawTickIndexes = Array.from(new Set(getChartTickIndexes(activeRange, data.length)))
  const tickIndexes = width < 640 ? rawTickIndexes.filter((_, index) => index % 2 === 0) : rawTickIndexes
  const xAxisTicks = tickIndexes.map((index, tickPosition) => {
    const point = points[Math.min(points.length - 1, Math.max(0, index))]
    return {
      x: point.x,
      label: point.label,
      anchor:
        tickPosition === 0
          ? ("start" as const)
          : tickPosition === tickIndexes.length - 1
            ? ("end" as const)
            : ("middle" as const),
    }
  })
  const linePath = monotoneLinePath(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`
  return { points, linePath, areaPath, axisTicks, xAxisTicks }
}

export function HeroAreaChart({
  data,
  activeRange,
  height = 240,
  formatValue = (value) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  formatYAxis = (value) => `$${Math.round(value)}`,
  gradientId = "heroAreaChartFill",
  className,
  tone,
  onActiveIndexChange,
}: HeroAreaChartProps) {
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 1_000, height })
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  void activeRange

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const width = Math.max(1, Math.round(entry.contentRect.width))
      const nextHeight = Math.max(1, Math.round(entry.contentRect.height))
      setDimensions((current) =>
        current.width === width && current.height === nextHeight ? current : { width, height: nextHeight },
      )
    })
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)))
    observer.observe(shell)
    return () => observer.disconnect()
  }, [])

  const resolvedTone: "positive" | "negative" | "neutral" =
    tone ?? (data.length >= 2 && data[data.length - 1].value < data[0].value ? "negative" : "positive")
  const color = TONE_COLORS[resolvedTone]
  const geometry = useMemo(
    () => buildHeroAreaGeometry(data, dimensions.width, dimensions.height, activeRange, formatYAxis),
    [activeRange, data, dimensions, formatYAxis],
  )
  const activePoint = activeIndex == null ? null : geometry.points[activeIndex]
  const lastPoint = geometry.points[geometry.points.length - 1]
  const chartShellClassName =
    className ??
    "relative h-[210px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.12)_1px,transparent_0)] before:[background-size:18px_18px] before:[mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_100%)] before:content-[''] dark:before:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] sm:h-[240px]"

  const setPointerIndex = (event: PointerEvent<HTMLDivElement>) => {
    if (data.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)))
    const index = Math.round(ratio * (data.length - 1))
    setActiveIndex(index)
    onActiveIndexChange?.(index)
  }

  const clearPointer = () => {
    setActiveIndex(null)
    onActiveIndexChange?.(null)
  }

  return (
    <div
      ref={shellRef}
      className={chartShellClassName}
      style={height !== 240 ? { height } : undefined}
      onPointerMove={setPointerIndex}
      onPointerLeave={clearPointer}
      data-testid="hero-area-chart"
    >
      <svg
        aria-label="Market value trend"
        role="img"
        className="size-full overflow-visible"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color.fill} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color.fill} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {geometry.axisTicks.length > 0 ? (
          <g aria-hidden="true">
            {geometry.axisTicks.map((tick) => (
              <line
                key={`${tick.value}-${tick.y}-grid`}
                x1={0}
                x2={dimensions.width}
                y1={tick.y}
                y2={tick.y}
                stroke="hsl(var(--border))"
                strokeOpacity="0.45"
                strokeDasharray="2 6"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ) : null}
        {geometry.areaPath ? <path d={geometry.areaPath} fill={`url(#${gradientId})`} /> : null}
        {geometry.linePath ? (
          <path
            d={geometry.linePath}
            fill="none"
            stroke={color.stroke}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {activePoint ? (
          <>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={4}
              y2={dimensions.height - 34}
              stroke={color.cursor}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5"
              fill={color.stroke}
              stroke="hsl(var(--background))"
              strokeWidth="2.5"
            />
          </>
        ) : lastPoint ? (
          <>
            {isVisible ? (
              <circle cx={lastPoint.x} cy={lastPoint.y} fill={color.stroke} opacity="0.45">
                <animate attributeName="r" values="5;18" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
            ) : null}
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="5.5"
              fill={color.stroke}
              stroke="hsl(var(--background))"
              strokeWidth="2.5"
            />
          </>
        ) : null}
        {geometry.axisTicks.length > 0 ? (
          <g aria-hidden="true">
            {geometry.axisTicks.map((tick) => (
              <g key={`${tick.value}-${tick.y}-label`}>
                <text
                  x={dimensions.width - 2}
                  y={tick.y}
                  dominantBaseline="middle"
                  textAnchor="end"
                  className="fill-muted-foreground font-data text-[12.5px] font-medium"
                >
                  {tick.label}
                </text>
              </g>
            ))}
          </g>
        ) : null}
        {geometry.xAxisTicks.length > 0 ? (
          <g aria-hidden="true">
            {geometry.xAxisTicks.map((tick) => (
              <text
                key={`${tick.x}-${tick.label}`}
                x={tick.x}
                y={dimensions.height - 8}
                textAnchor={tick.anchor}
                className="fill-muted-foreground font-data text-[12px] font-medium"
              >
                {tick.label}
              </text>
            ))}
          </g>
        ) : null}
      </svg>

      {activePoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-xs border border-border bg-popover px-2.5 py-1.5 shadow-elev-2"
          style={{ left: activePoint.x, top: activePoint.y }}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">{activePoint.label}</span>
            <span className="font-data text-[12.5px] font-medium text-foreground">
              {formatValue(activePoint.value)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

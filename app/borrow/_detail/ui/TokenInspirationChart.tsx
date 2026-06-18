"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Series, TimeRangeId } from "@/app/lib/borrow-detail"

export type TokenChartHover = {
  value: number
  time: string
  index: number
}

type Props = {
  series: Series
  timeRange: TimeRangeId
  height?: number
  onHoverChange?: (hover: TokenChartHover | null) => void
}

type ChartRow = { idx: number; value: number; label: string; iso: string }

export function TokenInspirationChart({ series, timeRange, height = 248, onHoverChange }: Props) {
  void timeRange
  const gradId = React.useId().replace(/:/g, "")
  const data = React.useMemo(() => toChartRows(series.points), [series.points])

  const handleMove = React.useCallback(
    (state: { activePayload?: Array<{ payload?: ChartRow }> } | null) => {
      if (!onHoverChange) return
      const row = state?.activePayload?.[0]?.payload
      if (!row) {
        onHoverChange(null)
        return
      }
      onHoverChange({ value: row.value, time: row.iso, index: row.idx })
    },
    [onHoverChange],
  )

  return (
    <div className="w-full select-none" style={{ height }} data-testid="token-inspiration-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          onMouseMove={handleMove}
          onMouseLeave={() => onHoverChange?.(null)}
        >
          <defs>
            <linearGradient id={`fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A3A3A3", fontSize: 11 }}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A3A3A3", fontSize: 11 }}
            width={56}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />

          <Tooltip content={() => null} cursor={{ stroke: "#E5E5E5", strokeWidth: 1 }} />

          <Area
            type="linear"
            dataKey="value"
            stroke="#1A1A1A"
            strokeWidth={1.5}
            fill={`url(#fill-${gradId})`}
            fillOpacity={1}
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#1A1A1A",
              stroke: "#FFFFFF",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function toChartRows(points: Series["points"]): ChartRow[] {
  return [...points]
    .filter((p) => Number.isFinite(p.v))
    .sort((a, b) => (a.t > b.t ? 1 : a.t < b.t ? -1 : 0))
    .map((p, idx) => ({
      idx,
      value: p.v,
      iso: p.t,
      label: formatTick(p.t),
    }))
}

function formatTick(raw: string) {
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

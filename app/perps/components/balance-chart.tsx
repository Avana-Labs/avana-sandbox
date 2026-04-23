"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"
import { useTheme } from "next-themes"
import { makeChartPalette, type ThemeMode } from "@/app/lib/chart-colors"

const mockData = [
  { time: "00:00", value: 47000 },
  { time: "04:00", value: 47200 },
  { time: "08:00", value: 46800 },
  { time: "12:00", value: 47500 },
  { time: "16:00", value: 48000 },
  { time: "20:00", value: 47900 },
  { time: "24:00", value: 48250 },
]

const DEFAULT_SYMBOLS = ["ETH", "BTC", "SOL"]

export function BalanceChart({ symbols = DEFAULT_SYMBOLS }: { symbols?: string[] }) {
  const { resolvedTheme } = useTheme()
  const theme: ThemeMode = resolvedTheme === "dark" ? "dark" : "light"
  const gradientId = React.useId()
  const symbolKey = React.useMemo(() => symbols.join("|"), [symbols])
  const palette = React.useMemo(() => makeChartPalette({ symbols, theme }), [symbolKey, theme])

  return (
    <Card className="border-border bg-surface-raised shadow-elev-1">
      <CardContent className="p-0">
        <div className="h-[240px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.fillTop} />
                  <stop offset="95%" stopColor={palette.fillBottom} />
                </linearGradient>
              </defs>
              <Tooltip
                cursor={{ stroke: palette.cursor, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xs border border-border bg-popover px-2 py-1.5 shadow-elev-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                            {payload[0].payload.time}
                          </span>
                          <span className="font-data text-[12.5px] font-medium text-foreground">
                            ${payload[0].value?.toLocaleString()}
                          </span>
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
                stroke={palette.stroke}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

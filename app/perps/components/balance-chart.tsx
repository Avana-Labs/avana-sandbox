"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

const mockData = [
  { time: "00:00", value: 47000 },
  { time: "04:00", value: 47200 },
  { time: "08:00", value: 46800 },
  { time: "12:00", value: 47500 },
  { time: "16:00", value: 48000 },
  { time: "20:00", value: 47900 },
  { time: "24:00", value: 48250 },
]

export function BalanceChart() {
  return (
    <Card className="border-border/40 bg-card/50 shadow-none">
      <CardContent className="p-0">
        <div className="h-[240px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {payload[0].payload.time}
                          </span>
                          <span className="font-data font-medium">
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
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useDisplayPreferences } from "@/app/components/display-preferences"

type Market = {
  symbol: string
  name: string
  price: number
  funding: number
  change: number
  volume: number
  maxLeverage: number
  longOi: number
  shortOi: number
}

const HERO_STATS = [
  { label: "24h Volume", tone: "emerald" },
  { label: "Average Funding", tone: "emerald" },
  { label: "Average Max Lev", tone: "amber" },
] as const

function formatUsd(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

export function MultiplyHero({ markets }: { markets: ReadonlyArray<Market> }) {
  const { showDollarAmounts } = useDisplayPreferences()

  const metrics = useMemo(() => {
    const activeMarkets = markets.filter((market) => market.volume > 0)
    const totalVolume = activeMarkets.reduce((sum, market) => sum + market.volume, 0)
    const totalTvl = activeMarkets.reduce((sum, market) => sum + market.volume / Math.max(1, market.maxLeverage), 0)
    const averageFunding = activeMarkets.length > 0 ? activeMarkets.reduce((sum, market) => sum + market.funding, 0) / activeMarkets.length : 0
    const averageMaxLeverage =
      activeMarkets.length > 0 ? activeMarkets.reduce((sum, market) => sum + market.maxLeverage, 0) / activeMarkets.length : 0
    const totalChange =
      totalVolume > 0 ? activeMarkets.reduce((sum, market) => sum + market.change * market.volume, 0) / totalVolume : 0

    return { totalVolume, totalTvl, averageFunding, averageMaxLeverage, totalChange }
  }, [markets])

  const metricValue = (label: string) => {
    if (!showDollarAmounts) return "••••••••"
    if (label === "24h Volume") return formatUsd(metrics.totalVolume)
    if (label === "Average Funding") return `${metrics.averageFunding.toFixed(2)}%`
    if (label === "Average Max Lev") return `${metrics.averageMaxLeverage.toFixed(0)}x`
    return "••••••••"
  }

  return (
    <section className="mb-4 px-1 md:px-2">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {showDollarAmounts ? formatUsd(metrics.totalTvl) : "••••••••"}
            </p>
            <span className={cn("inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums", metrics.totalChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
              <span aria-hidden className="text-[10px] leading-none">
                {metrics.totalChange >= 0 ? "▲" : "▼"}
              </span>
              {showDollarAmounts ? `${metrics.totalChange >= 0 ? "+" : ""}${metrics.totalChange.toFixed(2)}% Today` : "••••••"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
          {HERO_STATS.map((metric) => (
            <div key={metric.label}>
              <div
                className={cn(
                  "mb-1 flex items-center gap-1.5 text-[11px] font-medium md:justify-end",
                  metric.tone === "emerald" && "text-hero-metric-emerald",
                  metric.tone === "amber" && "text-hero-metric-amber",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    metric.tone === "emerald" && "bg-[#7ec39f]",
                    metric.tone === "amber" && "bg-[#c29f78]",
                    metric.tone === "amber" && "bg-[#c29f78]",
                  )}
                />
                {metric.label}
              </div>
              <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">{metricValue(metric.label)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

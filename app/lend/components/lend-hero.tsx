"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import type { LendPageData } from "@/app/lib/data/providers/lend"

const LEND_METRICS = [
  { label: "Average APY", tone: "emerald" },
  { label: "Avg Utilization", tone: "violet" },
  { label: "Active Markets", tone: "amber" },
] as const

function parseMarketUsd(value: string) {
  const normalized = value.trim().replace(/[$,]/g, "")
  const suffix = normalized.slice(-1).toUpperCase()
  const numericPortion = suffix >= "A" && suffix <= "Z" ? normalized.slice(0, -1) : normalized
  const amount = Number.parseFloat(numericPortion)
  if (!Number.isFinite(amount)) return 0
  if (suffix === "B") return amount * 1_000_000_000
  if (suffix === "M") return amount * 1_000_000
  if (suffix === "K") return amount * 1_000
  return amount
}

function formatMarketUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

export function LendHero({ markets }: { markets: ReadonlyArray<LendPageData["markets"][number]> }) {
  const { showDollarAmounts } = useDisplayPreferences()

  const metrics = useMemo(() => {
    const activeMarkets = markets.filter((market) => !market.soon)
    const marketValues = activeMarkets.map((market) => ({
      ...market,
      tvlUsd: parseMarketUsd(market.tvl),
    }))
    const totalTvl = marketValues.reduce((sum, market) => sum + market.tvlUsd, 0)
    const weightedApy =
      totalTvl > 0
        ? marketValues.reduce((sum, market) => sum + market.apy * market.tvlUsd, 0) / totalTvl
        : 0
    const weightedUtilization =
      totalTvl > 0
        ? marketValues.reduce((sum, market) => sum + market.utilization * market.tvlUsd, 0) / totalTvl
        : 0
    const weightedChange24h =
      totalTvl > 0
        ? marketValues.reduce((sum, market) => sum + market.apyChange24h * market.tvlUsd, 0) / totalTvl
        : 0

    return {
      totalTvl,
      weightedApy,
      weightedUtilization,
      activeMarkets: activeMarkets.length,
      weightedChange24h,
    }
  }, [markets])

  return (
    <section className="mb-4 px-1 md:px-2">
      <div className="flex flex-col gap-4 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[12px] font-medium tracking-tight text-muted-foreground">Total TVL</p>
            <p className="font-data text-[22px] font-medium leading-none tracking-tight text-foreground md:text-[26px]">
              {showDollarAmounts ? formatMarketUsd(metrics.totalTvl) : "••••••••"}
            </p>
            <span className="inline-flex items-center gap-1 font-data text-[11px] font-medium tabular-nums text-emerald-600">
              <span aria-hidden className="text-[10px] leading-none">
                {metrics.weightedChange24h >= 0 ? "▲" : "▼"}
              </span>
              {showDollarAmounts ? `${metrics.weightedChange24h >= 0 ? "+" : ""}${metrics.weightedChange24h.toFixed(2)}% Today` : "••••••"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5 md:ml-auto md:text-right">
          {LEND_METRICS.map((metric) => (
            <div key={metric.label}>
              <div
                className={cn(
                  "mb-1 flex items-center gap-1.5 text-[11px] font-medium md:justify-end",
                  metric.tone === "emerald" && "text-[#6ca98b]",
                  metric.tone === "violet" && "text-[#7d72cc]",
                  metric.tone === "amber" && "text-[#b1835f]",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    metric.tone === "emerald" && "bg-[#7ec39f]",
                    metric.tone === "violet" && "bg-[#a092ef]",
                    metric.tone === "amber" && "bg-[#c29f78]",
                  )}
                />
                {metric.label}
              </div>
              <p className="font-data text-[1rem] font-semibold tracking-tight text-foreground">
                {showDollarAmounts
                  ? metric.label === "Average APY"
                    ? `${metrics.weightedApy.toFixed(2)}%`
                    : metric.label === "Avg Utilization"
                      ? `${metrics.weightedUtilization.toFixed(2)}%`
                      : metrics.activeMarkets.toString()
                  : "••••••••"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

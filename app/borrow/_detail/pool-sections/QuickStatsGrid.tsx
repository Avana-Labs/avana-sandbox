"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { redenominateCompactUsd } from "@/app/lib/currency/format"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { cn } from "@/lib/utils"

type QuickStatLike = {
  id: string
  label: string
  value: string
  tooltip?: string
}

type Props = {
  detail: { quickStats: QuickStatLike[] }
  className?: string
}

const RISK_STAT_IDS = new Set([
  "collateralsAtRisk",
  "eligibleForLiquidations",
  "riskPremium",
  "maxLtv",
  "collateralFactor",
])

function splitQuickStats(stats: QuickStatLike[]) {
  const market: QuickStatLike[] = []
  const risk: QuickStatLike[] = []

  for (const stat of stats) {
    if (RISK_STAT_IDS.has(stat.id)) {
      risk.push(stat)
    } else {
      market.push(stat)
    }
  }

  return { market, risk }
}

function StatsGrid({ stats }: { stats: QuickStatLike[] }) {
  const { ctx } = useCurrency()
  if (stats.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:gap-x-10 md:gap-y-9">
      {stats.map((stat) => (
        <article key={stat.id} className="min-w-0">
          <div className="font-data text-[26px] font-semibold leading-none tracking-[-0.04em] text-foreground md:text-[28px]">
            {redenominateCompactUsd(stat.value, ctx)}
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[13px] font-normal leading-snug text-muted-foreground">{stat.label}</span>
            {stat.tooltip ? <ActionMetricHelp text={stat.tooltip} topic={stat.label} /> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

export function QuickStatsGrid({ detail, className }: Props) {
  const { market, risk } = splitQuickStats(detail.quickStats)

  return (
    <div className={cn("space-y-10", className)}>
      {market.length > 0 ? (
        <section aria-label="Market overview">
          <h3 className="mb-5 text-[15px] font-medium tracking-[-0.02em] text-foreground">Market overview</h3>
          <StatsGrid stats={market} />
        </section>
      ) : null}
      {risk.length > 0 ? (
        <section aria-label="Risk exposure">
          <h3 className="mb-5 text-[15px] font-medium tracking-[-0.02em] text-foreground">Risk exposure</h3>
          <StatsGrid stats={risk} />
        </section>
      ) : null}
    </div>
  )
}

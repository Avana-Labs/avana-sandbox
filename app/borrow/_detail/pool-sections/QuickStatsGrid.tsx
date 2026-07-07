"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { redenominateCompactUsd } from "@/app/lib/currency/format"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  const { t } = useTranslation()
  if (stats.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:gap-x-10">
      {stats.map((stat) => (
        <article key={stat.id} className="min-w-0">
          <div className="font-data text-[19px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[21px]">
            {redenominateCompactUsd(stat.value, ctx)}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[13px] font-normal leading-snug text-muted-foreground">{t(stat.label)}</span>
            {stat.tooltip ? <ActionMetricHelp text={stat.tooltip} topic={stat.label} /> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

export function QuickStatsGrid({ detail, className }: Props) {
  const { t } = useTranslation()
  const { market, risk } = splitQuickStats(detail.quickStats)

  return (
    <div className={cn("space-y-10", className)}>
      {market.length > 0 ? <StatsGrid stats={market} /> : null}
      {risk.length > 0 ? (
        <section aria-label={t("Risk exposure")} className="space-y-5">
          <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">{t("Risk exposure")}</h2>
          <StatsGrid stats={risk} />
        </section>
      ) : null}
    </div>
  )
}

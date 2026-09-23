"use client"

import * as React from "react"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { resolveBorrowDetailMetricHelp } from "@/app/lib/borrow-detail/metric-help"
import { redenominateCompactUsd } from "@/app/lib/currency/format"
import { useCurrency } from "@/app/lib/currency/use-currency"
import type { QuickStatsProduct } from "@/app/lib/detail-page/live-quick-stats"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { formatTokenPrice } from "@/app/lib/prices/format"
import { useCanonicalPriceFor } from "@/app/lib/prices/token-prices-context"
import { cn } from "@/lib/utils"

type QuickStatLike = {
  id: string
  label: string
  value: string
  tooltip?: string
}

type Props = {
  detail: { hero?: unknown; quickStats: QuickStatLike[] }
  product?: QuickStatsProduct
  className?: string
  hideRisk?: boolean
  /** Desktop column count for the main market stats grid (default 3). */
  columns?: 3 | 4
}

const RISK_STAT_IDS = new Set(["riskPremium", "maxLtv", "collateralFactor"])

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

function StatsGrid({ stats, columns = 3 }: { stats: QuickStatLike[]; columns?: 3 | 4 }) {
  const { ctx } = useCurrency()
  const { t } = useTranslation()
  if (stats.length === 0) return null

  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-x-6 gap-y-6 md:gap-x-10",
        columns === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3",
      )}
    >
      {stats.map((stat) => {
        const tooltip = stat.tooltip ?? resolveBorrowDetailMetricHelp(stat.label)

        return (
          <article key={stat.id} className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[13px] font-normal leading-snug text-muted-foreground">{t(stat.label)}</span>
              {tooltip ? <ActionMetricHelp text={tooltip} topic={stat.label} /> : null}
            </div>
            <div className="mt-1.5 font-data text-[20px] font-normal leading-none tracking-[-0.01em] text-foreground md:text-[22px]">
              {redenominateCompactUsd(stat.value, ctx)}
            </div>
          </article>
        )
      })}
    </div>
  )
}

/** Flat stat grid without the Key Statistics risk-exposure split (e.g. Market Rates). */
export function FlatStatsGrid({
  stats,
  className,
  columns = 3,
}: {
  stats: QuickStatLike[]
  className?: string
  columns?: 3 | 4
}) {
  if (stats.length === 0) return null
  return (
    <div className={cn(className)}>
      <StatsGrid stats={stats} columns={columns} />
    </div>
  )
}

function QuickStatsGridView({ detail, className, hideRisk = false, columns = 3 }: Omit<Props, "product">) {
  const { t } = useTranslation()
  const { market, risk } = splitQuickStats(detail.quickStats)

  return (
    <div className={cn("space-y-10", className)}>
      {market.length > 0 ? <StatsGrid stats={market} columns={columns} /> : null}
      {!hideRisk && risk.length > 0 ? (
        <section aria-label={t("Risk exposure")} className="space-y-5">
          <h2 className="text-[22px] font-medium leading-none tracking-[-0.01em] text-foreground md:text-[24px]">
            {t("Risk exposure")}
          </h2>
          <StatsGrid stats={risk} columns={4} />
        </section>
      ) : null}
    </div>
  )
}

export function QuickStatsGrid(props: Props) {
  const priceFor = useCanonicalPriceFor()
  const hero = props.detail.hero
  const symbol =
    hero && typeof hero === "object" && "symbol" in hero && typeof hero.symbol === "string" ? hero.symbol : undefined
  const price = symbol ? priceFor(symbol) : undefined
  const quickStats = React.useMemo(() => {
    if (price === undefined) return props.detail.quickStats
    return props.detail.quickStats.map((stat) =>
      stat.id === "price" ? { ...stat, value: formatTokenPrice(price) } : stat,
    )
  }, [price, props.detail.quickStats])
  const detail = quickStats === props.detail.quickStats ? props.detail : { ...props.detail, quickStats }

  // The shared reactive price source keeps detail-page stats aligned with market tables as oracle
  // quotes arrive; all other preloaded stats remain untouched.
  return <QuickStatsGridView {...props} detail={detail} />
}

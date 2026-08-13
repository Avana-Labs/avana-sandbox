"use client"

import * as React from "react"
import { usePreloadedQuery } from "convex/react"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { resolveBorrowDetailMetricHelp } from "@/app/lib/borrow-detail/metric-help"
import { redenominateCompactUsd } from "@/app/lib/currency/format"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useConvexLiveSession } from "@/app/lib/convex/use-convex-live-session"
import { mergeLiveQuickStats, type QuickStatsProduct } from "@/app/lib/detail-page/live-quick-stats"
import type { QuickStatsPreload } from "@/app/lib/detail-page/quick-stats-preload"
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
  /** Preloaded getQuickStats token + product enable the live variant (connected sessions). */
  quickStatsPreload?: QuickStatsPreload | null
  product?: QuickStatsProduct
  className?: string
  hideRisk?: boolean
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
            <div className="mt-1.5 font-data text-[19px] font-semibold leading-none tracking-[-0.03em] text-foreground md:text-[21px]">
              {redenominateCompactUsd(stat.value, ctx)}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function QuickStatsGridView({ detail, className, hideRisk = false }: Omit<Props, "quickStatsPreload" | "product">) {
  const { t } = useTranslation()
  const { market, risk } = splitQuickStats(detail.quickStats)

  return (
    <div className={cn("space-y-10", className)}>
      {market.length > 0 ? <StatsGrid stats={market} /> : null}
      {!hideRisk && risk.length > 0 ? (
        <section aria-label={t("Risk exposure")} className="space-y-5">
          <h2 className="text-[22px] font-medium leading-none tracking-[-0.03em] text-foreground md:text-[24px]">
            {t("Risk exposure")}
          </h2>
          <StatsGrid stats={risk} columns={4} />
        </section>
      ) : null}
    </div>
  )
}

/**
 * Live wrapper: hydrates getQuickStats from the server-preloaded token via
 * `usePreloadedQuery` (no client re-fetch) and subscribes for updates, re-merging the fresh
 * values over the already-merged base via the shared alias map. Only mounted where a Convex
 * provider exists AND a preload token + product were supplied — see the chooser below.
 */
function QuickStatsGridLive({
  preload,
  product,
  ...props
}: Omit<Props, "quickStatsPreload" | "product"> & { preload: QuickStatsPreload; product: QuickStatsProduct }) {
  const live = usePreloadedQuery(preload)
  const detail = React.useMemo(
    () => ({ ...props.detail, quickStats: mergeLiveQuickStats(props.detail.quickStats, live, product) }),
    [props.detail, live, product],
  )
  return <QuickStatsGridView {...props} detail={detail} />
}

export function QuickStatsGrid(props: Props) {
  const liveSession = useConvexLiveSession()
  return liveSession && props.quickStatsPreload && props.product ? (
    <QuickStatsGridLive {...props} preload={props.quickStatsPreload} product={props.product} />
  ) : (
    <QuickStatsGridView {...props} />
  )
}

"use client"

import { useState } from "react"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { PortfolioHistoryMetricId } from "@/app/dashboard/use-dashboard-history-feeds"
import { useDashboardHistoryFeeds } from "@/app/dashboard/use-dashboard-history-feeds"

const METRIC_ORDER: PortfolioHistoryMetricId[] = ["netValue", "supplied", "borrowed", "earned", "multiplyExposure"]

function metricLabel(id: PortfolioHistoryMetricId, t: (key: string) => string): string {
  switch (id) {
    case "netValue":
      return t("Net Value")
    case "supplied":
      return t("Supplied")
    case "borrowed":
      return t("Borrowed")
    case "earned":
      return t("Earned")
    case "multiplyExposure":
      return t("Multiply Exposure")
  }
}

/**
 * Wave-4 E-S5 / E-M2 / E-M3: history charts stacked under the portfolio hero.
 * The metric-toggled chart on top reads portfolioSnapshots and lets the user
 * pick any of {net value, supplied, borrowed, earned, multiply exposure}. The
 * companion chart below plots the wallet's health factor over time from
 * `riskSnapshots`. Both charts share the range-aware bucketing in
 * `use-dashboard-history-feeds.ts`, so each 1D/1W/1M/… range only shows the
 * points inside that window rather than the entire series being smeared into
 * every tab.
 */
export function PortfolioHistoryCharts({
  walletId,
  hideValue = false,
}: {
  walletId: string | undefined
  hideValue?: boolean
}) {
  const { t } = useTranslation()
  const feeds = useDashboardHistoryFeeds(walletId)
  const [activeMetric, setActiveMetric] = useState<PortfolioHistoryMetricId>("netValue")

  const metricTabs = METRIC_ORDER.map((id) => metricLabel(id, t))
  const activeTabLabel = metricLabel(activeMetric, t)

  if (feeds.snapshotCount === 0 && feeds.riskPointCount === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="dashboard-portfolio-history-heading"
      className="rounded-radius-md border border-border bg-background/40 p-4 md:p-5"
    >
      <div className="mb-3 flex flex-col gap-1">
        <h3
          id="dashboard-portfolio-history-heading"
          className="text-[16px] font-medium tracking-tight text-foreground md:text-[17px]"
        >
          {t("Portfolio history")}
        </h3>
        <p className="text-[13px] text-muted-foreground">
          {t("Range-aware history for portfolio metrics and account health.")}
        </p>
      </div>

      {feeds.snapshotCount > 0 ? (
        <div className="mb-6">
          <MarketHeroChart
            feed={feeds.portfolio[activeMetric]}
            defaultRange="1M"
            hideValue={hideValue}
            label={activeTabLabel}
            metricTabs={metricTabs}
            activeMetricTab={activeTabLabel}
            onMetricTabChange={(tab) => {
              const next = METRIC_ORDER.find((id) => metricLabel(id, t) === tab)
              if (next) setActiveMetric(next)
            }}
          />
        </div>
      ) : null}

      {feeds.riskPointCount > 0 ? (
        <div>
          <MarketHeroChart feed={feeds.risk} defaultRange="1M" hideValue={hideValue} label={t("Health factor")} />
        </div>
      ) : null}
    </section>
  )
}

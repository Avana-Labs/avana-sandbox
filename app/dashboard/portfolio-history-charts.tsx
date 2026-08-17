"use client"

import { Component, useMemo, useState, type ReactNode } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  buildPortfolioMetricFeeds,
  buildRiskSeriesFeed,
  type PortfolioHistoryMetricId,
} from "@/app/dashboard/use-dashboard-history-feeds"

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
 * Isolated boundary. Convex's useQuery throws for a server error, and we want a
 * per-chart failure (e.g. getRiskSeries not yet deployed to this Convex) to hide
 * that chart alone rather than the whole panel. Nothing else on the dashboard
 * should go dark just because one reactive query is down.
 */
class QueryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[PortfolioHistoryCharts] hidden after query error:", error)
    }
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function PortfolioMetricChart({ walletId, hideValue }: { walletId: string | undefined; hideValue: boolean }) {
  const { t } = useTranslation()
  const portfolio = useQuery(api.sandbox.transactions.getPortfolio, walletId ? { wallet: walletId } : "skip")
  const [activeMetric, setActiveMetric] = useState<PortfolioHistoryMetricId>("netValue")

  const { feeds, snapshotCount } = useMemo(() => {
    const snapshots = portfolio?.snapshots ?? []
    return {
      feeds: buildPortfolioMetricFeeds(snapshots as Parameters<typeof buildPortfolioMetricFeeds>[0]),
      snapshotCount: snapshots.length,
    }
  }, [portfolio?.snapshots])

  if (snapshotCount === 0) return null

  const metricTabs = METRIC_ORDER.map((id) => metricLabel(id, t))
  const activeTabLabel = metricLabel(activeMetric, t)

  return (
    <div className="mb-6">
      <MarketHeroChart
        feed={feeds[activeMetric]}
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
  )
}

function HealthFactorChart({ walletId, hideValue }: { walletId: string | undefined; hideValue: boolean }) {
  const { t } = useTranslation()
  const riskSeries = useQuery(api.sandbox.transactions.getRiskSeries, walletId ? { wallet: walletId } : "skip")
  const feed = useMemo(() => buildRiskSeriesFeed(riskSeries ?? []), [riskSeries])
  if (!riskSeries || riskSeries.length === 0) return null
  return (
    <div>
      <MarketHeroChart feed={feed} defaultRange="1M" hideValue={hideValue} label={t("Health factor")} />
    </div>
  )
}

/**
 * Wave-4 E-S5 / E-M2 / E-M3: history charts stacked under the portfolio hero.
 * The metric-toggled chart on top reads portfolioSnapshots and lets the user
 * pick any of {net value, supplied, borrowed, earned, multiply exposure}. The
 * companion chart below plots the wallet's health factor over time from
 * `riskSnapshots`. Each subchart owns its own useQuery + boundary, so a Convex
 * error on one (e.g. getRiskSeries not yet deployed) doesn't hide the other.
 */
export function PortfolioHistoryCharts({
  walletId,
  hideValue = false,
}: {
  walletId: string | undefined
  hideValue?: boolean
}) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="dashboard-portfolio-history-heading"
      className="rounded-radius-md border border-border bg-background/40 p-4 md:p-5 empty:hidden"
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

      <QueryBoundary>
        <PortfolioMetricChart walletId={walletId} hideValue={hideValue} />
      </QueryBoundary>
      <QueryBoundary>
        <HealthFactorChart walletId={walletId} hideValue={hideValue} />
      </QueryBoundary>
    </section>
  )
}

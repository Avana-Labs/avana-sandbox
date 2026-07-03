"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type { DashboardOverviewMetrics, DashboardPerformanceMetrics } from "./dashboard-tab-metrics"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

type MetricItem = {
  label: string
  value: string
  description: string
}

function MetricGrid({ metrics }: { metrics: MetricItem[] }) {
  return (
    <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-x-8">
      {metrics.map((metric) => (
        <article key={metric.label} className="min-w-0 space-y-1.5">
          <div className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-[-0.04em] text-foreground">
            {metric.value}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium tracking-tight text-muted-foreground">{metric.label}</span>
            <ActionMetricHelp text={metric.description} topic={metric.label} />
          </div>
        </article>
      ))}
    </div>
  )
}

export function DashboardOverviewSection({ title, metrics }: { title: string; metrics: DashboardOverviewMetrics }) {
  const { showDollarAmounts } = useDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: t("Net Value"),
            value: m(formatUsdExact(metrics.netValueUsd)),
            description: t("Total value of your positions minus outstanding loans"),
          },
          {
            label: t("Total Borrowed"),
            value: m(formatUsdExact(metrics.totalBorrowedUsd)),
            description: t("Current outstanding loan balance"),
          },
          {
            label: t("Liquidation Buffer"),
            value: m(formatUsdExact(metrics.liquidationBufferUsd)),
            description: t("Distance from liquidation based on current collateral value"),
          },
          {
            label: t("Risk Premium"),
            value: showDollarAmounts ? formatPct(metrics.riskPremiumPct) : MASK,
            description: t("An additional cost on your borrow rate based on the riskiness of your collateral"),
          },
        ]}
      />
    </section>
  )
}

export function DashboardPerformanceSection({
  title,
  metrics,
}: {
  title: string
  metrics: DashboardPerformanceMetrics
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: t("Pool Collateral"),
            value: m(formatUsdExact(metrics.poolCollateralUsd)),
            description: t("LP positions currently securing your loans"),
          },
          {
            label: t("Net APY"),
            value: showDollarAmounts ? formatPct(metrics.netApyPct) : MASK,
            description: t("Weighted average APY across all active positions"),
          },
          {
            label: t("Interest Earned"),
            value: m(formatUsdExact(metrics.interestEarnedUsd)),
            description: t("Total yield earned from trading fees activities"),
          },
          {
            label: t("Interest Owed"),
            value: m(formatUsdExact(metrics.interestOwedUsd)),
            description: t("Total interest accrued on outstanding loans"),
          },
        ]}
      />
    </section>
  )
}

export type DashboardLendPerformanceMetrics = {
  totalSuppliedUsd: number
  netApyPct: number
  interestEarnedUsd: number
  claimableRewardsUsd: number
}

export function DashboardLendPerformanceSection({
  title,
  metrics,
}: {
  title: string
  metrics: DashboardLendPerformanceMetrics
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: t("Total Supplied"),
            value: m(formatUsdExact(metrics.totalSuppliedUsd)),
            description: t("Total assets currently supplied and earning yield"),
          },
          {
            label: t("Net APY"),
            value: showDollarAmounts ? formatPct(metrics.netApyPct) : MASK,
            description: t("Weighted average APY across all supplied positions"),
          },
          {
            label: t("Interest Earned"),
            value: m(formatUsdExact(metrics.interestEarnedUsd)),
            description: t("Total yield accrued across your lending positions"),
          },
          {
            label: t("Claimable Rewards"),
            value: m(formatUsdExact(metrics.claimableRewardsUsd)),
            description: t("Rewards available to claim from your lending activity"),
          },
        ]}
      />
    </section>
  )
}

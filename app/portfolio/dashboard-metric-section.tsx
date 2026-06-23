"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import type { DashboardOverviewMetrics, DashboardPerformanceMetrics } from "./dashboard-tab-metrics"

const MASK = "••••"

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

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

export function DashboardOverviewSection({
  title,
  metrics,
}: {
  title: string
  metrics: DashboardOverviewMetrics
}) {
  const { showDollarAmounts } = useDisplayPreferences()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: "Net Value",
            value: m(formatUsd(metrics.netValueUsd)),
            description: "Total value of your positions minus outstanding loans",
          },
          {
            label: "Total Borrowed",
            value: m(formatUsd(metrics.totalBorrowedUsd)),
            description: "Current outstanding loan balance",
          },
          {
            label: "Liquidation Buffer",
            value: m(formatUsd(metrics.liquidationBufferUsd)),
            description: "Distance from liquidation based on current collateral value",
          },
          {
            label: "Risk Premium",
            value: showDollarAmounts ? formatPct(metrics.riskPremiumPct) : MASK,
            description: "An additional cost on your borrow rate based on the riskiness of your collateral",
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
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: "Pool Collateral",
            value: m(formatUsd(metrics.poolCollateralUsd)),
            description: "LP positions currently securing your loans",
          },
          {
            label: "Net APY",
            value: showDollarAmounts ? formatPct(metrics.netApyPct) : MASK,
            description: "Weighted average APY across all active positions",
          },
          {
            label: "Interest Earned",
            value: m(formatUsd(metrics.interestEarnedUsd)),
            description: "Total yield earned from trading fees activities",
          },
          {
            label: "Interest Owed",
            value: m(formatUsd(metrics.interestOwedUsd)),
            description: "Total interest accrued on outstanding loans",
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
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4">
      <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      <MetricGrid
        metrics={[
          {
            label: "Total Supplied",
            value: m(formatUsd(metrics.totalSuppliedUsd)),
            description: "Total assets currently supplied and earning yield",
          },
          {
            label: "Net APY",
            value: showDollarAmounts ? formatPct(metrics.netApyPct) : MASK,
            description: "Weighted average APY across all supplied positions",
          },
          {
            label: "Interest Earned",
            value: m(formatUsd(metrics.interestEarnedUsd)),
            description: "Total yield accrued across your lending positions",
          },
          {
            label: "Claimable Rewards",
            value: m(formatUsd(metrics.claimableRewardsUsd)),
            description: "Rewards available to claim from your lending activity",
          },
        ]}
      />
    </section>
  )
}

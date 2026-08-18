"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
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

function MetricGrid({ metrics, labelOnTop = false }: { metrics: MetricItem[]; labelOnTop?: boolean }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
      {metrics.map((metric) => {
        const value = (
          <div className="font-data text-[clamp(1.35rem,1.8vw,1.95rem)] font-medium leading-none tracking-normal tabular-nums text-foreground">
            {metric.value}
          </div>
        )
        const label = (
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-muted-foreground">{metric.label}</span>
            <ActionMetricHelp text={metric.description} topic={metric.label} />
          </div>
        )
        return (
          <article
            key={metric.label}
            className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:space-y-1.5"
          >
            {labelOnTop ? (
              <>
                {label}
                {value}
              </>
            ) : (
              <>
                {value}
                {label}
              </>
            )}
          </article>
        )
      })}
    </div>
  )
}

export function DashboardOverviewSection({
  title,
  metrics,
  hideHeading = false,
}: {
  title: string
  metrics: DashboardOverviewMetrics
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid
        labelOnTop
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

/**
 * Credit (Borrow) overview — a dedicated variant of the overview grid. Unlike the
 * shared DashboardOverviewSection (still used by the Looping tab), this leads with
 * Net Value (the same collateral − debt figure that feeds the portfolio headline) so
 * the tab reconciles with "Your Portfolio", then shows its two components + Net APY.
 * Approved borrowing capacity lives in the "Borrowing Power" card below.
 */
export function DashboardCreditOverviewSection({
  title,
  netValueUsd,
  totalBorrowedUsd,
  netApyPct,
  totalCollateralUsd,
  interestOwedUsd,
  liquidationBufferUsd,
  hideHeading = false,
}: {
  title: string
  netValueUsd: number
  totalBorrowedUsd: number
  netApyPct: number
  totalCollateralUsd: number
  // Cumulative interest already accrued against the outstanding debt. Optional so
  // legacy callers (Looping tab) don't have to plumb it before they wire the
  // credit engine's interestOwedUsd6; when omitted the tile is dropped rather
  // than showing a false zero.
  interestOwedUsd?: number
  // USD distance from liquidation (liquidation value − debt). Optional so callers
  // that don't have a solvency snapshot can omit the tile rather than show a zero.
  liquidationBufferUsd?: number
  // When the section title is already provided by an enclosing tab, suppress the h2.
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  const metrics: MetricItem[] = [
    {
      label: t("Net Value"),
      value: m(formatUsdExact(netValueUsd)),
      description: t("Your collateral value minus what you owe — the equity this tab adds to your portfolio"),
    },
    {
      label: t("Total Collateral"),
      value: m(formatUsdExact(totalCollateralUsd)),
      description: t("LP positions currently securing your loans"),
    },
    {
      label: t("Total Borrowed"),
      value: m(formatUsdExact(totalBorrowedUsd)),
      description: t("Current outstanding loan balance"),
    },
  ]
  if (liquidationBufferUsd !== undefined) {
    metrics.push({
      label: t("Liquidation Buffer"),
      value: m(formatUsdExact(liquidationBufferUsd)),
      description: t("Distance from liquidation based on current collateral value"),
    })
  }
  metrics.push({
    label: t("Net APY"),
    value: showDollarAmounts ? formatPct(netApyPct) : MASK,
    description: t("Weighted average APY across all active positions"),
  })
  if (interestOwedUsd !== undefined) {
    metrics.push({
      label: t("Interest Owed"),
      value: m(formatUsdExact(interestOwedUsd)),
      description: t("Total interest accrued on your outstanding loans"),
    })
  }

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid labelOnTop metrics={metrics} />
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
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4 pb-3">
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
            label: t("Interest Owed"),
            value: m(formatUsdExact(metrics.interestOwedUsd)),
            description: t("Total interest accrued on your outstanding loans"),
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
  rewardsEarnedUsd: number
  claimableRewardsUsd: number
}

export function DashboardLendPerformanceSection({
  title,
  metrics,
  hideHeading = false,
}: {
  title: string
  metrics: DashboardLendPerformanceMetrics
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid
        labelOnTop
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
            description: t("Supply interest accrued across your lending positions (excludes protocol rewards)"),
          },
          {
            label: t("Rewards Earned"),
            value: m(formatUsdExact(metrics.rewardsEarnedUsd)),
            description: t("Protocol rewards accrued across your lending positions"),
          },
        ]}
      />
    </section>
  )
}

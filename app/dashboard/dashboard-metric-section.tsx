"use client"

import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { formatUsdExact } from "@/app/lib/borrow-sim"
import { formatHealthFactor } from "@/app/lib/data/borrow-domain"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import type {
  BorrowBalanceMetrics,
  DashboardOverviewMetrics,
  DashboardPerformanceMetrics,
  LendBalanceMetrics,
  MultiplyBalanceMetrics,
} from "./dashboard-tab-metrics"

const MASK = "••••"

function formatPct(value: number) {
  return `${value.toFixed(2)}%`
}

function formatLeverage(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—"
  return `${value.toFixed(2)}×`
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
 * Wallet-level Borrow Balance — eight product metrics aggregated across every
 * Borrow position belonging to the connected wallet.
 */
export function DashboardCreditOverviewSection({
  title,
  metrics,
  hideHeading = false,
}: {
  title: string
  metrics: BorrowBalanceMetrics
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)
  const hfLabel = formatHealthFactor(metrics.healthFactor)

  const items: MetricItem[] = [
    {
      label: t("Net Value"),
      value: m(formatUsdExact(metrics.netValueUsd)),
      description: t("Your collateral value minus what you owe — the equity this tab adds to your portfolio"),
    },
    {
      label: t("Collateral Value"),
      value: m(formatUsdExact(metrics.collateralValueUsd)),
      description: t("LP positions currently securing your loans"),
    },
    {
      label: t("Total Borrowed"),
      value: m(formatUsdExact(metrics.totalBorrowedUsd)),
      description: t("Current outstanding loan balance"),
    },
    {
      label: t("Available to Borrow"),
      value: m(formatUsdExact(metrics.availableToBorrowUsd)),
      description: t("Additional amount you can borrow against your pledged collateral within Avana credit limits"),
    },
    {
      label: t("Health Factor"),
      value: showDollarAmounts ? hfLabel : MASK,
      description: t(
        "Wallet-wide liquidation value divided by total borrowed. Higher is safer; below 1 risks liquidation.",
      ),
    },
    {
      label: t("Liquidation Buffer"),
      value: m(formatUsdExact(metrics.liquidationBufferUsd)),
      description: t("Distance from liquidation based on current collateral value"),
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
  ]

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid labelOnTop metrics={items} />
    </section>
  )
}

/**
 * Wallet-level Multiply Balance — eight product metrics aggregated across every
 * Multiply position belonging to the connected wallet.
 */
export function DashboardMultiplyBalanceSection({
  title,
  metrics,
  hideHeading = false,
}: {
  title: string
  metrics: MultiplyBalanceMetrics
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)
  const hfLabel = formatHealthFactor(metrics.healthFactor)

  const items: MetricItem[] = [
    {
      label: t("Net Value"),
      value: m(formatUsdExact(metrics.netValueUsd)),
      description: t("Total value of your positions minus outstanding loans"),
    },
    {
      label: t("Position Value"),
      value: m(formatUsdExact(metrics.positionValueUsd)),
      description: t("Gross Multiply exposure after looping across all positions"),
    },
    {
      label: t("Total Borrowed"),
      value: m(formatUsdExact(metrics.totalBorrowedUsd)),
      description: t("Current outstanding loan balance"),
    },
    {
      label: t("Leverage"),
      value: showDollarAmounts ? formatLeverage(metrics.leverageX) : MASK,
      description: t("Portfolio leverage as position value divided by equity"),
    },
    {
      label: t("Net APY"),
      value: showDollarAmounts ? formatPct(metrics.netApyPct) : MASK,
      description: t("Equity-weighted net APY after supply yield and borrow cost"),
    },
    {
      label: t("Health Factor"),
      value: showDollarAmounts ? hfLabel : MASK,
      description: t(
        "Combined liquidation value divided by total Multiply debt. Higher is safer; below 1 risks liquidation.",
      ),
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
  ]

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid labelOnTop metrics={items} />
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

/**
 * Wallet-level Lend Balance — eight growth metrics across every active Lend
 * position. Rewards stay on the Claim path / assets table, not these cards.
 */
export function DashboardLendPerformanceSection({
  title,
  metrics,
  hideHeading = false,
}: {
  title: string
  metrics: LendBalanceMetrics
  hideHeading?: boolean
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()
  const m = (value: string) => (showDollarAmounts ? value : MASK)

  const projectionHint = t("Projected earnings at current rates")

  const items: MetricItem[] = [
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
      label: t("Yield Generated"),
      value: showDollarAmounts ? formatPct(metrics.yieldGeneratedPct) : MASK,
      description: t("Interest earned as a percentage of principal you supplied"),
    },
    {
      label: t("1 Day"),
      value: showDollarAmounts ? `+${formatUsdExact(metrics.projectedEarnings1dUsd)}` : MASK,
      description: projectionHint,
    },
    {
      label: t("30 Days"),
      value: showDollarAmounts ? `+${formatUsdExact(metrics.projectedEarnings30dUsd)}` : MASK,
      description: projectionHint,
    },
    {
      label: t("90 Days"),
      value: showDollarAmounts ? `+${formatUsdExact(metrics.projectedEarnings90dUsd)}` : MASK,
      description: projectionHint,
    },
    {
      label: t("6 Months"),
      value: showDollarAmounts ? `+${formatUsdExact(metrics.projectedEarnings6mUsd)}` : MASK,
      description: projectionHint,
    },
  ]

  return (
    <section className="space-y-4 pb-3">
      {hideHeading ? null : (
        <h2 className="text-[19px] font-medium tracking-[-0.03em] text-foreground md:text-[20px]">{title}</h2>
      )}
      <MetricGrid labelOnTop metrics={items} />
    </section>
  )
}

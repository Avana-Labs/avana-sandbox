"use client"

import { type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { CircleDollarSign, Info } from "@/app/components/icons"
import { Button } from "@/components/ui/button"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { formatChartValue, type ChartFeed } from "@/app/components/charts"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { DashboardQuickActions, type DashboardQuickActionsTab } from "@/app/dashboard/dashboard-quick-actions"

/**
 * Reward balances are denominated in AVA (the card shows the AVA coin icon), not
 * USD — so format the real earned/claimable totals as AVA amounts rather than a
 * hardcoded "$0". (#26b)
 */
function formatAva(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })} AVA`
}

function AvanaCoin() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand ring-1 ring-brand/20"
      aria-hidden
    >
      <Image
        src="/avana-icon.png"
        alt=""
        width={38}
        height={38}
        className="h-[38px] w-[38px] scale-[1.68] object-contain brightness-0 invert"
        style={{ width: 38, height: 38 }}
        priority
      />
    </div>
  )
}

function FeeCard({
  label,
  value,
  hidden,
  action,
}: {
  label: string
  value: string
  hidden: boolean
  action?: ReactNode
}) {
  return (
    <div className="rounded-radius-md border-0 bg-card px-4 py-4 dark:bg-white/[0.04]">
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
        {label}
        <Info className="h-3 w-3" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AvanaCoin />
          <span className="truncate text-[24px] font-normal leading-none tracking-[-0.03em] text-foreground sm:text-[26px]">
            {hidden ? "••••" : value}
          </span>
        </div>
        {action}
      </div>
    </div>
  )
}

/**
 * The rewards cards (Total Rewards earned / Claimable Rewards + Claim Rewards).
 * Rendered as the hero's right column on desktop and inline near the bottom of
 * the page on mobile, so it's reachable on small screens too.
 */
export function PortfolioRewardsCards({
  claimHref,
  earnedAmount = 0,
  claimableAmount = 0,
  activeTab,
  showQuickActions = false,
}: {
  claimHref?: string
  /** Total AVA earned across completed quests. */
  earnedAmount?: number
  /** AVA currently claimable. */
  claimableAmount?: number
  activeTab?: DashboardQuickActionsTab
  /** When true, render the compact quick-action icon rail under the claim cards. */
  showQuickActions?: boolean
}) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  return (
    <section className="min-w-0 space-y-4">
      <div className="space-y-3">
        <FeeCard label={t("Total Rewards earned")} value={formatAva(earnedAmount)} hidden={!showDollarAmounts} />
        <FeeCard
          label={t("Claimable Rewards")}
          value={formatAva(claimableAmount)}
          hidden={!showDollarAmounts}
          action={
            claimHref ? (
              <Button asChild size="sm" className="shrink-0 gap-2 font-bold [&_svg]:size-4">
                <Link href={claimHref}>
                  <CircleDollarSign className="size-4" />
                  {t("Claim Rewards")}
                </Link>
              </Button>
            ) : (
              <Button type="button" size="sm" disabled className="shrink-0 gap-2 font-bold [&_svg]:size-4">
                <CircleDollarSign className="size-4" />
                {t("Claim Rewards")}
              </Button>
            )
          }
        />
      </div>
      {showQuickActions ? <DashboardQuickActions activeTab={activeTab} /> : null}
    </section>
  )
}

export function RewardsBalanceHero({
  claimHref,
  assetsUsd,
  debtUsd,
  earnedAmount = 0,
  claimableAmount = 0,
  activeTab,
  feed,
}: {
  claimHref?: string
  /** Gross assets marked to market (wallet + all position assets + borrowed cash held). */
  assetsUsd?: number
  /** Outstanding liabilities (borrow + Multiply debt). */
  debtUsd?: number
  /** Total AVA earned across completed quests. */
  earnedAmount?: number
  /** AVA currently claimable. */
  claimableAmount?: number
  activeTab?: DashboardQuickActionsTab
  /** Convex-backed live portfolio chart feed. */
  feed: ChartFeed
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const { t } = useTranslation()

  // (i) explainer next to the headline — what the number means and why borrowing doesn't move it.
  const explainer = t(
    "Net Portfolio Value = Assets − Debt. Assets: wallet balances, lending supplied, borrow collateral, any borrowed funds you still hold, your Multiply position value, and Umbrella staked + rewards. Debt: borrow loans and Multiply borrowing. Borrowing doesn't change this number — the cash you receive is an asset that offsets the new debt.",
  )
  const info = <ActionMetricHelp text={explainer} topic="Portfolio Value" />

  // "$X Assets · $Y Debt" breakdown under the headline (masked with the privacy toggle).
  const breakdown =
    assetsUsd != null && debtUsd != null ? (
      <span>
        <span className="tabular-nums text-foreground">{formatChartValue("usd", assetsUsd)}</span> {t("Assets")}
        {" · "}
        <span className="tabular-nums text-foreground">{formatChartValue("usd", debtUsd)}</span> {t("Debt")}
      </span>
    ) : undefined

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
      {/* Same chart as lend detail, quieter balance — no card chrome. */}
      <section className="relative min-w-0 overflow-hidden pt-4" data-testid="portfolio-hero-chart">
        <MarketHeroChart
          feed={feed}
          defaultRange="1D"
          gradientId="rewardsBalanceFill"
          height={310}
          showMeta={false}
          showRangeSelector={false}
          hideValue={!showDollarAmounts}
          balanceVariant="quiet"
          balanceClassName="absolute left-2.5 top-0 z-10 -translate-y-0.5"
          balanceSuffix={info}
          balanceSubtitle={breakdown}
        />
      </section>

      <PortfolioRewardsCards
        claimHref={claimHref}
        earnedAmount={earnedAmount}
        claimableAmount={claimableAmount}
        activeTab={activeTab}
        showQuickActions
      />
    </div>
  )
}

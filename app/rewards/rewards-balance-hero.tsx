"use client"

import { useMemo, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { CircleDollarSign, Info } from "@/app/components/icons"
import { Button } from "@/components/ui/button"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { formatChartValue, type ChartFeed, type ChartPoint, type ChartRangeData } from "@/app/components/charts"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"

/**
 * Reward balances are denominated in AVA (the card shows the AVA coin icon), not
 * USD — so format the real earned/claimable totals as AVA amounts rather than a
 * hardcoded "$0". (#26b)
 */
function formatAva(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `${safe.toLocaleString(undefined, { maximumFractionDigits: 0 })} AVA`
}

const PORTFOLIO_TIME_LABELS = ["6:00 AM", "9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM", "Now"]

function seededRandom(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/**
 * Deterministic portfolio-value series that ends at `endUsd` so the chart and
 * headline share one live portfolio source of truth.
 */
export function buildPortfolioSeries(endUsd: number): ChartPoint[] {
  const COUNT = 64
  const end = Math.max(0, endUsd)
  const start = end > 0 ? end * 1.0395 : 0
  const random = seededRandom(20_260_716 + Math.round(end * 100))
  const values: number[] = []
  let value = start
  let velocity = 0
  for (let index = 0; index < COUNT; index += 1) {
    const progress = index / (COUNT - 1)
    const target = start + (end - start) * progress
    const meanReversion = (target - value) * 0.12
    velocity = velocity * 0.78 + meanReversion + (random() - 0.5) * Math.max(start, 1) * 0.006
    value += velocity
    values.push(Math.round(value * 100) / 100)
  }
  values[0] = Math.round(start * 100) / 100
  values[COUNT - 1] = Math.round(end * 100) / 100
  const tickIndexes = PORTFOLIO_TIME_LABELS.map((_, index) =>
    Math.round((index / (PORTFOLIO_TIME_LABELS.length - 1)) * (COUNT - 1)),
  )
  return values.map((point, index) => {
    const labelIndex = tickIndexes.findIndex((tickIndex, tickPosition) => {
      const nextTick = tickIndexes[tickPosition + 1] ?? COUNT
      return index >= tickIndex && index < nextTick
    })
    return {
      time: index,
      value: point,
      label: PORTFOLIO_TIME_LABELS[labelIndex] ?? PORTFOLIO_TIME_LABELS[PORTFOLIO_TIME_LABELS.length - 1],
    }
  })
}

function makePortfolioRangeData(points: ChartPoint[]): ChartRangeData {
  return {
    "1D": points,
    "1W": points,
    "1M": points,
    "3M": points,
    "1Y": points,
    All: points,
  }
}

function buildPortfolioFeed(portfolioValueUsd: number): ChartFeed {
  const points = buildPortfolioSeries(portfolioValueUsd)
  const first = points[0]?.value ?? portfolioValueUsd
  const last = points[points.length - 1]?.value ?? portfolioValueUsd
  const changeAbs = last - first
  const pct = first ? (changeAbs / first) * 100 : 0
  return {
    headlineValue: formatChartValue("usd", portfolioValueUsd),
    headlineDelta: `${formatChartValue("usd", Math.abs(changeAbs))} (${Math.abs(pct).toFixed(2)}%)`,
    deltaTone: pct >= 0 ? "positive" : "negative",
    rangeData: makePortfolioRangeData(points.length ? points : [{ time: 0, value: portfolioValueUsd, label: "Now" }]),
    // Same axis formatting as lend/market heroes; resting headline stays exact USD above.
    valueFormat: "usdCompact",
  }
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
}: {
  claimHref?: string
  /** Total AVA earned across completed quests. */
  earnedAmount?: number
  /** AVA currently claimable. */
  claimableAmount?: number
}) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  return (
    <section className="min-w-0 space-y-3">
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
    </section>
  )
}

export function RewardsBalanceHero({
  claimHref,
  portfolioValueUsd = 0,
  earnedAmount = 0,
  claimableAmount = 0,
}: {
  claimHref?: string
  /** Live portfolio net value (wallet + positions). Required for a trustworthy hero. */
  portfolioValueUsd?: number
  /** Total AVA earned across completed quests. */
  earnedAmount?: number
  /** AVA currently claimable. */
  claimableAmount?: number
}) {
  const { showDollarAmounts } = useAmountDisplayPreferences()
  const feed = useMemo(() => buildPortfolioFeed(portfolioValueUsd), [portfolioValueUsd])

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-20">
      {/* Same chart as lend detail, quieter balance, rewards-card surface. */}
      <section
        className="relative min-w-0 overflow-hidden rounded-radius-md border-0 bg-card px-1.5 pt-4 dark:bg-card/50"
        data-testid="portfolio-hero-chart"
      >
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
        />
      </section>

      <div className="hidden lg:block">
        <PortfolioRewardsCards claimHref={claimHref} earnedAmount={earnedAmount} claimableAmount={claimableAmount} />
      </div>
    </div>
  )
}

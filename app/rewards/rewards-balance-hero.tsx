"use client"

import { useMemo, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { CircleDollarSign, Eye, EyeOff, Info } from "@/app/components/icons"
import { Button } from "@/components/ui/button"
import { HeroBalanceDisplay } from "@/app/components/charts/hero-balance-display"
import { formatChartValue, type ChartPoint } from "@/app/components/charts"
import { useAmountDisplayPreferences } from "@/app/components/display-preferences"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const HeroAreaChart = dynamic(
  () => import("@/app/components/charts/hero-area-chart").then((mod) => mod.HeroAreaChart),
  {
    ssr: false,
    loading: () => <div aria-hidden className="h-[128px] w-full" />,
  },
)

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
  return values.map((point, index) => ({
    time: index,
    value: point,
    label: PORTFOLIO_TIME_LABELS[Math.round((index / (COUNT - 1)) * (PORTFOLIO_TIME_LABELS.length - 1))],
  }))
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
    <div className="rounded-radius-md border-0 bg-card px-4 py-4">
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
  const { t } = useTranslation()
  const { showDollarAmounts, toggleShowDollarAmounts } = useAmountDisplayPreferences()
  const series = useMemo(() => buildPortfolioSeries(portfolioValueUsd), [portfolioValueUsd])
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const hoverPoint = hoverIndex != null ? series[hoverIndex] : null

  const firstValue = series[0]?.value ?? 0
  const lastValue = series[series.length - 1]?.value ?? portfolioValueUsd
  const restingPct = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  const hoverPct = hoverPoint && firstValue ? ((hoverPoint.value - firstValue) / firstValue) * 100 : restingPct
  const balanceValue = hoverPoint
    ? formatChartValue("usd", hoverPoint.value)
    : formatChartValue("usd", portfolioValueUsd)
  const balanceDelta = hoverPoint
    ? `${Math.abs(hoverPct).toFixed(2)}%`
    : `${restingPct >= 0 ? "" : "-"}$${Math.abs(lastValue - firstValue).toFixed(2)} (${restingPct.toFixed(2)}%)`
  const balanceMeta = hoverPoint ? hoverPoint.label : undefined
  const balanceTone: "positive" | "negative" = hoverPct >= 0 ? "positive" : "negative"

  return (
    <div className="mb-6 grid gap-5 md:mb-8 md:gap-7 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] lg:items-start">
      <section className="relative overflow-hidden rounded-radius-md border-0 bg-card px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(148,163,184,0.16)_1px,transparent_1.2px)] [background-position:18px_18px] [background-size:16px_16px] dark:opacity-35 dark:[background-image:radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1.2px)]" />

        <div className="relative flex flex-col gap-3">
          <div className="min-w-0">
            <span className="sr-only">{t("AVA balance")}</span>
            <HeroBalanceDisplay
              value={balanceValue}
              delta={balanceDelta}
              deltaTone={balanceTone}
              meta={balanceMeta}
              hidden={!showDollarAmounts}
              valueSuffix={
                <button
                  type="button"
                  onClick={toggleShowDollarAmounts}
                  aria-label={t("Dollar amounts")}
                  aria-pressed={showDollarAmounts}
                  className="inline-flex shrink-0 items-center text-brand-readable transition-opacity hover:opacity-80"
                >
                  {showDollarAmounts ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              }
            />
          </div>

          <div className="-mx-4 -mb-4 mt-1 sm:-mx-5">
            <HeroAreaChart
              data={series}
              activeRange="1D"
              height={116}
              gradientId="rewardsBalanceFill"
              className="relative w-full"
              tone={balanceTone}
              formatValue={(v) => (showDollarAmounts ? formatChartValue("usd", v) : "••••")}
              onActiveIndexChange={setHoverIndex}
            />
          </div>
        </div>
      </section>

      <div className="hidden lg:block">
        <PortfolioRewardsCards claimHref={claimHref} earnedAmount={earnedAmount} claimableAmount={claimableAmount} />
      </div>
    </div>
  )
}

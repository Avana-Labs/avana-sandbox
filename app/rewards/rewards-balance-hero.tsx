"use client"

import { useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { CircleDollarSign, Info } from "lucide-react"
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

// TODO(backend): wire these to the user's real Avana balance (mirrors the portfolio hero).
const AVANA_BALANCE = "$14,400.00"
const AVANA_BALANCE_DELTA = "-$312.96 (-3.80%)"

// TODO(backend): wire these to real fee accrual once fees ship.
const TOTAL_FEES_EARNED = "$0"
const CLAIMABLE_FEES = "$0"

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
 * Deterministic, rich-looking portfolio-value series for the balance chart.
 * A mean-reverting walk that drifts from ~$14,968 down to exactly $14,400 (the
 * headline), so the resting -3.80% delta and the red trend line agree. Seeded so
 * SSR and the client render the identical path — no hydration mismatch.
 * TODO(backend): replace with the wallet's real balance history.
 */
function buildPortfolioSeries(): ChartPoint[] {
  const COUNT = 64
  const start = 14_968.8
  const end = 14_400
  const random = seededRandom(20_260_716)
  const values: number[] = []
  let value = start
  let velocity = 0
  for (let index = 0; index < COUNT; index += 1) {
    const progress = index / (COUNT - 1)
    const target = start + (end - start) * progress
    const meanReversion = (target - value) * 0.12
    velocity = velocity * 0.78 + meanReversion + (random() - 0.5) * start * 0.006
    value += velocity
    values.push(Math.round(value * 100) / 100)
  }
  // Pin the endpoints so the first/last points anchor the delta and headline.
  values[0] = start
  values[COUNT - 1] = end
  return values.map((point, index) => ({
    time: index,
    value: point,
    label: PORTFOLIO_TIME_LABELS[Math.round((index / (COUNT - 1)) * (PORTFOLIO_TIME_LABELS.length - 1))],
  }))
}

const PORTFOLIO_SERIES = buildPortfolioSeries()

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

export function RewardsBalanceHero({ claimHref }: { claimHref?: string }) {
  const { t } = useTranslation()
  const { showDollarAmounts } = useAmountDisplayPreferences()
  // The headline follows the cursor across the chart, mirroring the detail heroes.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const hoverPoint = hoverIndex != null ? PORTFOLIO_SERIES[hoverIndex] : null

  const firstValue = PORTFOLIO_SERIES[0]?.value ?? 0
  const hoverPct = hoverPoint && firstValue ? ((hoverPoint.value - firstValue) / firstValue) * 100 : 0
  const balanceValue = hoverPoint ? formatChartValue("usd", hoverPoint.value) : AVANA_BALANCE
  const balanceDelta = hoverPoint ? `${Math.abs(hoverPct).toFixed(2)}%` : AVANA_BALANCE_DELTA
  const balanceMeta = hoverPoint ? hoverPoint.label : undefined
  const balanceTone: "positive" | "negative" = hoverPoint ? (hoverPct >= 0 ? "positive" : "negative") : "negative"

  return (
    <div className="mb-6 grid gap-5 md:mb-8 md:gap-7 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
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
            />
          </div>

          {/* Height tuned so the card bottom aligns with the right column's fee cards. */}
          <div className="-mx-4 -mb-4 mt-1 sm:-mx-5">
            <HeroAreaChart
              data={PORTFOLIO_SERIES}
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

      <section className="hidden min-w-0 space-y-3 md:block">
        <FeeCard label={t("Total Fees earned")} value={TOTAL_FEES_EARNED} hidden={!showDollarAmounts} />
        <FeeCard
          label={t("Claimable Fees")}
          value={CLAIMABLE_FEES}
          hidden={!showDollarAmounts}
          action={
            claimHref ? (
              <Button asChild size="sm" className="shrink-0 gap-1.5">
                <Link href={claimHref}>
                  <CircleDollarSign className="size-4" />
                  {t("Claim Fees")}
                </Link>
              </Button>
            ) : (
              <Button type="button" size="sm" disabled className="shrink-0 gap-1.5">
                <CircleDollarSign className="size-4" />
                {t("Claim Fees")}
              </Button>
            )
          }
        />
      </section>
    </div>
  )
}

"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CircleArrowDown, CircleArrowUp, Download, HandCoins, Info, LogIn, LogOut, Receipt } from "lucide-react"
import {
  buildRangeData,
  resolveSeriesTone,
} from "@/app/components/charts/chart-data"
import type { ChartRangeData, ChartRangeOption } from "@/app/components/charts/types"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import { PortfolioHeroActions } from "@/app/portfolio/hero/portfolio-hero-actions"
import { PortfolioHeroHeader } from "@/app/portfolio/hero/portfolio-hero-header"
import type { PortfolioHeroAction } from "@/app/portfolio/hero/types"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { dashboardHrefForTab } from "@/app/lib/action-system/dashboard-routing"
import { useTranslation } from "@/app/lib/i18n/use-translation"

const HeroChartSection = dynamic(
  () => import("@/app/components/charts/hero-chart-section").then((mod) => mod.HeroChartSection),
  {
    loading: () => <div className="h-[196px] rounded-radius-md bg-card/60" />,
  },
)

const DEFAULT_RANGE_DATA = buildRangeData(880, 14)

type DashboardHeroProps = {
  tab: "overview" | "lending" | "looping" | "activity"
  tabs?: ReactNode
  headlineValue?: string
  headlineDelta?: string
  rangeData?: ChartRangeData
  statOneValue?: string
  statTwoValue?: string
  borrowSnapshot?: BorrowSnapshot
  multiplySnapshot?: BorrowSnapshot
  /** The user's primary open multiply position, used to pre-load "Increase loop". */
  multiplyPositionTarget?: { marketId: string; multiplier: number } | null
}

type HeroUiConfig = {
  headlineMeta?: string
  actionLabels?: string[]
  hideBalance?: boolean
  hideChart?: boolean
  hideActions?: boolean
  hideStats?: boolean
  statOneLabel?: string
  statOneHelpText?: string
  statTwoLabel?: string
  statTwoHelpText?: string
}

const HERO_UI_CONFIG: Record<DashboardHeroProps["tab"], HeroUiConfig> = {
  overview: {
    headlineMeta: "Approved credit",
  },
  lending: {
    // Label the headline so the per-tab figure reads as its own scope
    // ("Total supplied") instead of a single portfolio total that flip-flops.
    headlineMeta: "Total supplied",
    actionLabels: ["Borrow", "Repay", "Deposit", "Withdraw"],
    hideStats: true,
  },
  looping: {
    headlineMeta: "Multiply value",
    actionLabels: ["Increase loop", "Unwind loop"],
    hideChart: true,
    statOneLabel: "Open positions",
    statOneHelpText: "Open multiply positions in the wallet profile.",
    statTwoLabel: "Net carry",
    statTwoHelpText: "Average realized carry across the current multiply book.",
  },
  activity: {
    actionLabels: ["Product", "Action", "Status"],
    hideBalance: true,
    hideChart: true,
    hideActions: true,
    hideStats: true,
  },
}

function buildActions({
  actionLabels,
  primaryActionLabel,
  secondaryActionLabel,
  returnHref,
  onNavigate,
  multiplyPositionTarget,
  t,
}: {
  actionLabels?: string[]
  primaryActionLabel: string
  secondaryActionLabel: string
  returnHref?: string
  onNavigate?: (href: string) => void
  multiplyPositionTarget?: { marketId: string; multiplier: number } | null
  t: (key: string) => string
}): PortfolioHeroAction[] {
  const labels = actionLabels?.length ? actionLabels : [primaryActionLabel, secondaryActionLabel]

  const resolveHref = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes("borrow")) return actionPagePath("borrow", "borrow")
    if (normalized.includes("repay")) return actionPagePath("borrow", "repay")
    if (normalized.includes("deposit")) return actionPagePath("lend", "deposit")
    if (normalized.includes("withdraw")) return actionPagePath("lend", "withdraw")
    if (normalized.includes("increase")) {
      // Pre-load the user's actual position (market + current leverage baseline)
      // so "Increase loop" grows the existing loop instead of a blank form.
      return actionPagePath(
        "multiply",
        "multiply",
        multiplyPositionTarget
          ? { market: multiplyPositionTarget.marketId, multiplier: String(multiplyPositionTarget.multiplier) }
          : undefined,
      )
    }
    if (normalized.includes("unwind") || normalized.includes("deleverage")) {
      return actionPagePath(
        "multiply",
        "deleverage",
        multiplyPositionTarget ? { market: multiplyPositionTarget.marketId } : undefined,
      )
    }
    return null
  }

  // Reuse the directional glyphs from the lend/borrow tables (see action-icon.tsx):
  // deposit/supply flow down-into, borrow/increase up-out, repay is money back in,
  // withdraw/unwind is money out.
  const resolveIcon = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes("supply") || normalized.includes("deposit")) return CircleArrowDown
    if (normalized.includes("withdraw") || normalized.includes("unwind")) return LogOut
    if (normalized.includes("increase") || normalized.includes("borrow")) return CircleArrowUp
    if (normalized.includes("repay")) return LogIn
    if (normalized.includes("claim")) return HandCoins
    if (normalized.includes("view")) return Receipt
    return Download
  }

  return labels.map((label, index) => {
    const href = resolveHref(label)
    const actionHref = href && returnHref ? `${href}${href.includes("?") ? "&" : "?"}return=${encodeURIComponent(returnHref)}` : href
    return {
      id: `${index}-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label: t(label),
      icon: resolveIcon(label),
      href: actionHref ?? undefined,
      onClick: actionHref && onNavigate ? () => onNavigate(actionHref) : undefined,
    }
  })
}

function InfoTip({ text }: { text: string }) {
  return (
    <span role="img" className="inline-flex cursor-help text-muted-foreground/60" title={text} aria-label={text}>
      <Info className="h-3.5 w-3.5" />
    </span>
  )
}

const MASKED_VALUE = "••••••••"

function StatCard({ label, value, helpText, hidden = false }: { label: string; value: string; helpText: string; hidden?: boolean }) {
  return (
    <div className="bg-background p-3.5 dark:bg-card">
      <div className="mb-0.5 flex items-center gap-1 text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label} <InfoTip text={helpText} />
      </div>
      <div className="font-data text-[17px] font-medium tabular-nums text-brand dark:text-[#7DDCFF]">
        {hidden ? MASKED_VALUE : value}
      </div>
    </div>
  )
}

export function DashboardHero({
  tab,
  tabs,
  rangeData = DEFAULT_RANGE_DATA,
  statOneValue = "4.92%",
  statTwoValue = "+$12.46",
  multiplyPositionTarget,
}: DashboardHeroProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [activeRange, setActiveRange] = useState<ChartRangeOption>("1D")
  const { showDollarAmounts } = useDisplayPreferences()

  const uiConfig = HERO_UI_CONFIG[tab]
  const isBorrowOverview = tab === "overview"
  const isLoopingOverview = tab === "looping"
  const showBalance = !uiConfig.hideBalance

  const showChart = !isBorrowOverview && !uiConfig.hideChart
  const showActions = !uiConfig.hideActions
  const showStats = !uiConfig.hideStats
  const displayRangeData = showChart ? rangeData ?? DEFAULT_RANGE_DATA : null

  // Chart color tracks the active range's real trend, so a dip turns red.
  const activePoints = displayRangeData?.[activeRange] ?? []
  const trendTone = showChart ? resolveSeriesTone(activePoints) : "positive"

  const actions = showActions
    ? buildActions({
        actionLabels: uiConfig.actionLabels,
        primaryActionLabel: uiConfig.actionLabels?.[0] ?? "Deposit",
        secondaryActionLabel: uiConfig.actionLabels?.[1] ?? "Withdraw",
        returnHref: dashboardHrefForTab(tab),
        onNavigate: (href) => router.push(href),
        multiplyPositionTarget,
        t,
      })
    : []

  return (
    <section className="mb-8">
      <PortfolioHeroHeader />

      {tabs ? <div className="mt-6">{tabs}</div> : null}

      {isBorrowOverview || isLoopingOverview ? null : showBalance ? (
        <div className={showChart || showActions || showStats ? "mt-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6" : "mt-5"}>
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            {showChart ? (
              <HeroChartSection
                rangeData={displayRangeData ?? DEFAULT_RANGE_DATA}
                activeRange={activeRange}
                onRangeChange={setActiveRange}
                gradientId="portfolioHeroFill"
                // Shorter than the market-detail charts (240px) so the graph doesn't
                // dominate the otherwise sparse dashboard hero.
                height={190}
                tone={trendTone}
                // Mask keeps the trend shape but hides every dollar value: axis ticks and tooltip.
                formatYAxis={showDollarAmounts ? undefined : () => "••"}
                formatValue={showDollarAmounts ? undefined : () => MASKED_VALUE}
              />
            ) : null}
          </div>

          {showActions || showStats ? (
            <div className="flex min-w-0 flex-col gap-3 lg:pt-0">
              {showActions ? <PortfolioHeroActions actions={actions} /> : null}
              {showStats &&
              uiConfig.statOneLabel &&
              statOneValue &&
              uiConfig.statOneHelpText &&
              uiConfig.statTwoLabel &&
              statTwoValue &&
              uiConfig.statTwoHelpText ? (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-radius-md border border-border bg-border/80 dark:border-white/10 dark:bg-card/10">
                  <StatCard label={t(uiConfig.statOneLabel)} value={statOneValue} helpText={t(uiConfig.statOneHelpText)} hidden={!showDollarAmounts} />
                  <StatCard label={t(uiConfig.statTwoLabel)} value={statTwoValue} helpText={t(uiConfig.statTwoHelpText)} hidden={!showDollarAmounts} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Credit Health / Borrowing Power cards render under the Multiply Overview
          section in dashboard-client, not in the hero. */}
    </section>
  )
}

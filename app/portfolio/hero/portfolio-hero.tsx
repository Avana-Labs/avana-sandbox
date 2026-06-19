"use client"

import dynamic from "next/dynamic"
import type { ReactNode } from "react"
import { useState } from "react"
import { Info } from "lucide-react"
import {
  ArrowCircleDown24Filled,
  ArrowCircleUp24Filled,
  ArrowDownload24Filled,
  BuildingBank24Filled,
  ClipboardMore24Filled,
  Receipt24Filled,
  Wallet24Filled,
} from "@fluentui/react-icons"
import {
  buildRangeData,
  resolveSeriesChange,
  resolveSeriesTone,
} from "@/app/components/charts/chart-data"
import { formatChartValue } from "@/app/components/charts/format"
import { HeroBalanceDisplay } from "@/app/components/charts/hero-balance-display"
import type { ChartRangeData, ChartRangeOption } from "@/app/components/charts/types"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { CurrentLtvCard } from "@/app/dashboard/components/borrow-tab/debts-table"
import { SuppliesHealthFactorCard } from "@/app/dashboard/components/borrow-tab/supplies-table"
import { PortfolioHeroActions } from "./portfolio-hero-actions"
import { PortfolioHeroHeader } from "./portfolio-hero-header"
import type { BorrowSnapshot } from "../borrow-hero-state"
import type { PortfolioHeroAction } from "./types"

const HeroChartSection = dynamic(
  () => import("@/app/components/charts/hero-chart-section").then((mod) => mod.HeroChartSection),
  {
    loading: () => <div className="h-[196px] rounded-radius-md border border-border bg-surface-raised/60" />,
  },
)

const DEFAULT_RANGE_DATA = buildRangeData(880, 14)

const RANGE_PERIOD_WORD: Record<ChartRangeOption, string> = {
  "1H": "past hour",
  "1D": "today",
  "1W": "this week",
  "1M": "this month",
  "1Y": "this year",
  All: "all time",
}

type PortfolioHeroProps = {
  tab: "overview" | "lending" | "looping" | "activity"
  tabs?: ReactNode
  headlineValue?: string
  headlineDelta?: string
  rangeData?: ChartRangeData
  statOneValue?: string
  statTwoValue?: string
  borrowSnapshot?: BorrowSnapshot
  multiplySnapshot?: BorrowSnapshot
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

const HERO_UI_CONFIG: Record<PortfolioHeroProps["tab"], HeroUiConfig> = {
  overview: {
    headlineMeta: "Approved credit",
  },
  lending: {
    actionLabels: ["Borrow", "Repay", "Deposit", "Withdraw"],
    statOneLabel: "Average APY",
    statOneHelpText: "Weighted average APY across supplied assets in the wallet.",
    statTwoLabel: "Earned",
    statTwoHelpText: "Total yield already accrued by the portfolio.",
  },
  looping: {
    actionLabels: ["Increase loop", "Unwind loop"],
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
}: {
  actionLabels?: string[]
  primaryActionLabel: string
  secondaryActionLabel: string
}): PortfolioHeroAction[] {
  const labels = actionLabels?.length ? actionLabels : [primaryActionLabel, secondaryActionLabel]

  const resolveClasses = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes("borrow")) {
      return "!border-border/70 !bg-background !text-[#0B9BC9] hover:!bg-surface-inset dark:!border-white/10 dark:!bg-[#0f141b] dark:!text-[#7DDCFF] dark:hover:!bg-[#142331]"
    }
    if (normalized.includes("repay")) {
      return "!border-border/70 !bg-background !text-black hover:!bg-surface-inset dark:!border-white/10 dark:!bg-[#0f141b] dark:!text-white dark:hover:!bg-[#142331]"
    }
    if (normalized.includes("deposit") || normalized.includes("supply")) {
      return "!border-border/70 !bg-background !text-[#16A34A] hover:!bg-surface-inset dark:!border-white/10 dark:!bg-[#0f141b] dark:!text-[#74d79c] dark:hover:!bg-[#142331]"
    }
    if (normalized.includes("withdraw") || normalized.includes("unwind")) {
      return "!border-border/70 !bg-background !text-[#E11D48] hover:!bg-surface-inset dark:!border-white/10 dark:!bg-[#0f141b] dark:!text-[#f38aa3] dark:hover:!bg-[#142331]"
    }
    return "!border-border/70 !bg-background !text-[#01AACF] hover:!bg-surface-inset dark:!border-white/10 dark:!bg-[#0f141b] dark:!text-[#7DDCFF] dark:hover:!bg-[#142331]"
  }

  const resolveIcon = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes("supply") || normalized.includes("deposit")) return Wallet24Filled
    if (normalized.includes("withdraw") || normalized.includes("unwind")) return ArrowCircleDown24Filled
    if (normalized.includes("increase")) return ArrowCircleUp24Filled
    if (normalized.includes("borrow")) return BuildingBank24Filled
    if (normalized.includes("view")) return Receipt24Filled
    if (normalized.includes("export")) return ClipboardMore24Filled
    return ArrowDownload24Filled
  }

  return labels.map((label, index) => {
    return {
      id: `${index}-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      icon: resolveIcon(label),
      onClick: undefined,
      className: resolveClasses(label),
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

function StatCard({ label, value, helpText }: { label: string; value: string; helpText: string }) {
  return (
    <div className="bg-background p-3.5 dark:bg-[#0f141b]">
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label} <InfoTip text={helpText} />
      </div>
      <div className="font-data text-[17px] font-medium tabular-nums text-[#01AACF] dark:text-[#7DDCFF]">{value}</div>
    </div>
  )
}

export function PortfolioHero({
  tab,
  tabs,
  headlineValue,
  headlineDelta,
  rangeData = DEFAULT_RANGE_DATA,
  statOneValue = "4.92%",
  statTwoValue = "+$12.46",
  borrowSnapshot,
  multiplySnapshot,
}: PortfolioHeroProps) {
  const [activeRange, setActiveRange] = useState<ChartRangeOption>("1D")
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const { showDollarAmounts } = useDisplayPreferences()

  const uiConfig = HERO_UI_CONFIG[tab]
  const isBorrowOverview = tab === "overview"
  const isLoopingOverview = tab === "looping"
  const showBalance = !uiConfig.hideBalance

  const showChart = !isBorrowOverview && !isLoopingOverview && !uiConfig.hideChart
  const showActions = !uiConfig.hideActions
  const showStats = !uiConfig.hideStats
  const displayRangeData = showChart ? rangeData ?? DEFAULT_RANGE_DATA : null

  // Delta + color track the active range's real trend, so a dip turns red.
  const activePoints = displayRangeData?.[activeRange] ?? []
  const trendTone = showChart ? resolveSeriesTone(activePoints) : "positive"
  const trendChange = showChart ? resolveSeriesChange(activePoints) : null
  const hoverPoint = showChart && hoverIndex != null ? activePoints[hoverIndex] ?? null : null
  const firstPoint = activePoints[0]
  const displayPoint = hoverPoint ?? activePoints[activePoints.length - 1]
  const displayTone = hoverPoint
    ? hoverPoint.value >= (firstPoint?.value ?? hoverPoint.value)
      ? "positive"
      : "negative"
    : trendTone
  const resolvedHeadlineValue = headlineValue ?? (displayPoint ? formatChartValue("usd", displayPoint.value) : "$0.00")
  const displayDelta = showChart && trendChange
    ? hoverPoint
      ? (() => {
          const baseValue = firstPoint?.value ?? hoverPoint.value
          const changeAbs = Math.abs(hoverPoint.value - baseValue)
          const pct = baseValue ? ((hoverPoint.value - baseValue) / baseValue) * 100 : 0
          return `${formatChartValue("usd", changeAbs)} (${Math.abs(pct).toFixed(2)}%) ${RANGE_PERIOD_WORD[activeRange]}`
        })()
      : `$${trendChange.changeAbs.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} (${Math.abs(trendChange.pct).toFixed(2)}%) ${RANGE_PERIOD_WORD[activeRange]}`
    : undefined
  const resolvedDisplayValue = hoverPoint ? formatChartValue("usd", displayPoint.value) : resolvedHeadlineValue
  const resolvedHeadlineDelta = headlineDelta ?? displayDelta
  const overviewDelta = headlineDelta ?? undefined

  const actions = showActions
    ? buildActions({
        actionLabels: uiConfig.actionLabels,
        primaryActionLabel: uiConfig.actionLabels?.[0] ?? "Deposit",
        secondaryActionLabel: uiConfig.actionLabels?.[1] ?? "Withdraw",
      })
    : []

  return (
    <section className="mb-8">
      <PortfolioHeroHeader />

      {tabs ? <div className="mt-6">{tabs}</div> : null}

      {isBorrowOverview || isLoopingOverview ? (
        <div className="mt-5">
          <HeroBalanceDisplay
            value={resolvedDisplayValue}
            delta={headlineDelta ?? (isLoopingOverview ? "" : overviewDelta ?? "")}
            deltaTone={isLoopingOverview ? (headlineDelta?.includes("-") ? "negative" : "positive") : "positive"}
            meta={uiConfig.headlineMeta}
            hidden={!showDollarAmounts}
          />
          {isBorrowOverview && borrowSnapshot ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <SuppliesHealthFactorCard averageHealthFactor={borrowSnapshot.averageHealthFactor} showBalance={showDollarAmounts} />
              <CurrentLtvCard
                borrowedUsd={borrowSnapshot.totalBorrowedUsd}
                collateralUsd={borrowSnapshot.totalCollateralUsd}
                showBalance={showDollarAmounts}
              />
            </div>
          ) : null}
          {isLoopingOverview && multiplySnapshot ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <SuppliesHealthFactorCard averageHealthFactor={multiplySnapshot.averageHealthFactor} showBalance={showDollarAmounts} />
              <CurrentLtvCard
                borrowedUsd={multiplySnapshot.totalBorrowedUsd}
                collateralUsd={multiplySnapshot.totalCollateralUsd}
                showBalance={showDollarAmounts}
              />
            </div>
          ) : null}
        </div>
      ) : showBalance ? (
        <div className={showChart || showActions || showStats ? "mt-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6" : "mt-5"}>
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            <HeroBalanceDisplay
              value={resolvedDisplayValue}
              delta={resolvedHeadlineDelta ?? ""}
              deltaTone={displayTone}
              meta={uiConfig.headlineMeta}
              hidden={!showDollarAmounts}
            />
            {showChart ? (
              <HeroChartSection
                rangeData={displayRangeData ?? DEFAULT_RANGE_DATA}
                activeRange={activeRange}
                onRangeChange={(range) => {
                  setHoverIndex(null)
                  setActiveRange(range)
                }}
                onActiveIndexChange={setHoverIndex}
                gradientId="portfolioHeroFill"
                tone={trendTone}
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
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border/80 dark:border-white/10 dark:bg-white/10">
                  <StatCard label={uiConfig.statOneLabel} value={statOneValue} helpText={uiConfig.statOneHelpText} />
                  <StatCard label={uiConfig.statTwoLabel} value={statTwoValue} helpText={uiConfig.statTwoHelpText} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

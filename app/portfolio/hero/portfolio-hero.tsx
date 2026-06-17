"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
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
  HeroBalanceDisplay,
  HeroChartSection,
  formatChartValue,
  resolveSeriesChange,
  resolveSeriesTone,
  type ChartRangeData,
  type ChartRangeOption,
} from "@/app/components/charts"
import { getPortfolioHeroFeed } from "@/app/lib/chart-feeds"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PortfolioHeroActions } from "./portfolio-hero-actions"
import { PortfolioHeroHeader } from "./portfolio-hero-header"
import { PORTFOLIO_NETWORKS } from "./portfolio-network-data"
import type { NetworkId, PortfolioHeroAction } from "./types"

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
  tabs?: ReactNode
  initialNetwork?: NetworkId
  headlineValue?: string
  headlineDelta?: string
  rangeData?: ChartRangeData
  actionLabels?: string[]
  hideChart?: boolean
  hideActions?: boolean
  hideStats?: boolean
  primaryActionLabel?: string
  secondaryActionLabel?: string
  statOneLabel?: string
  statOneValue?: string
  statOneHelpText?: string
  statTwoLabel?: string
  statTwoValue?: string
  statTwoHelpText?: string
  walletName?: string
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
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="inline h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  tabs,
  initialNetwork = "all",
  headlineValue,
  headlineDelta,
  rangeData = DEFAULT_RANGE_DATA,
  actionLabels,
  hideChart = false,
  hideActions = false,
  hideStats = false,
  primaryActionLabel = "Deposit",
  secondaryActionLabel = "Withdraw",
  statOneLabel = "Average APY",
  statOneValue = "4.92%",
  statOneHelpText = "Weighted average APY across all your deposited assets.",
  statTwoLabel = "Interest earned",
  statTwoValue = "+$12.46",
  statTwoHelpText = "Total yield earned from all active positions over time.",
  walletName = "Demo wallet",
}: PortfolioHeroProps) {
  const [activeRange, setActiveRange] = useState<ChartRangeOption>("1D")
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>(initialNetwork)
  const { showDollarAmounts } = useDisplayPreferences()

  const activeNetwork = PORTFOLIO_NETWORKS.find((network) => network.id === selectedNetwork) ?? PORTFOLIO_NETWORKS[0]

  const networkFeed = useMemo(
    () =>
      getPortfolioHeroFeed({
        balance: activeNetwork.balance,
        delta: activeNetwork.delta,
        chartBase: activeNetwork.chartBase,
        chartVariance: activeNetwork.chartVariance,
      }),
    [activeNetwork.balance, activeNetwork.delta, activeNetwork.chartBase, activeNetwork.chartVariance],
  )

  const displayRangeData = useMemo(() => {
    if (selectedNetwork === "all") {
      return rangeData
    }
    return networkFeed.rangeData
  }, [networkFeed.rangeData, rangeData, selectedNetwork])

  // Delta + color track the active range's real trend, so a dip turns red.
  const activePoints = displayRangeData[activeRange]
  const trendTone = resolveSeriesTone(activePoints)
  const trendChange = resolveSeriesChange(activePoints)
  const hoverPoint = hoverIndex == null ? null : activePoints[hoverIndex] ?? null
  const firstPoint = activePoints[0]
  const displayPoint = hoverPoint ?? activePoints[activePoints.length - 1]
  const displayTone = hoverPoint
    ? hoverPoint.value >= (firstPoint?.value ?? hoverPoint.value)
      ? "positive"
      : "negative"
    : trendTone
  const displayDelta = hoverPoint ? (() => {
    const baseValue = firstPoint?.value ?? hoverPoint.value
    const changeAbs = Math.abs(hoverPoint.value - baseValue)
    const pct = baseValue ? ((hoverPoint.value - baseValue) / baseValue) * 100 : 0
    return `${formatChartValue("usd", changeAbs)} (${Math.abs(pct).toFixed(2)}%) ${RANGE_PERIOD_WORD[activeRange]}`
  })() : `$${trendChange.changeAbs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} (${Math.abs(trendChange.pct).toFixed(2)}%) ${RANGE_PERIOD_WORD[activeRange]}`
  const resolvedHeadlineValue = selectedNetwork === "all" ? (headlineValue ?? activeNetwork.balance) : activeNetwork.balance
  const resolvedDisplayValue = hoverPoint ? formatChartValue("usd", displayPoint.value) : resolvedHeadlineValue

  const actions = buildActions({
    actionLabels,
    primaryActionLabel,
    secondaryActionLabel,
  })

  return (
    <section className="mb-8">
      <PortfolioHeroHeader
        walletName={walletName}
        selectedNetwork={selectedNetwork}
        onNetworkChange={setSelectedNetwork}
      />

      {tabs ? <div className="mt-6">{tabs}</div> : null}

      {hideChart && hideActions && hideStats ? null : (
        <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-2.5 sm:space-y-3">
            <HeroBalanceDisplay
              value={resolvedDisplayValue}
              delta={hoverPoint ? displayDelta : (headlineDelta ?? displayDelta)}
              deltaTone={displayTone}
              hidden={!showDollarAmounts}
            />
            {hideChart ? null : (
              <HeroChartSection
                rangeData={displayRangeData}
                activeRange={activeRange}
                onRangeChange={(range) => {
                  setHoverIndex(null)
                  setActiveRange(range)
                }}
                onActiveIndexChange={setHoverIndex}
                gradientId="portfolioHeroFill"
                tone={trendTone}
              />
            )}
          </div>

          {hideActions && hideStats ? null : (
            <div className="flex min-w-0 flex-col gap-3 lg:pt-0">
              {hideActions ? null : <PortfolioHeroActions actions={actions} />}
              {hideStats && statOneLabel && statOneValue && statOneHelpText && statTwoLabel && statTwoValue && statTwoHelpText ? null : statOneLabel && statOneValue && statOneHelpText && statTwoLabel && statTwoValue && statTwoHelpText ? (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-border bg-border/80 dark:border-white/10 dark:bg-white/10">
                  <StatCard label={statOneLabel} value={statOneValue} helpText={statOneHelpText} />
                  <StatCard label={statTwoLabel} value={statTwoValue} helpText={statTwoHelpText} />
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { ArrowDownload24Filled, ArrowUpload24Filled } from "@fluentui/react-icons"
import {
  buildRangeData,
  HeroBalanceDisplay,
  HeroChartSection,
  resolveSeriesChange,
  resolveSeriesTone,
  type ChartRangeData,
  type ChartRangeOption,
} from "@/app/components/charts"
import { getPortfolioHeroFeed } from "@/app/lib/chart-feeds"
import { useDisplayPreferences } from "@/app/components/display-preferences"
import { TOKENS } from "../../lend/components/data"
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
  openDeposit?: (token: typeof TOKENS[number]) => void
  openWithdraw?: (token: typeof TOKENS[number]) => void
  tabs?: ReactNode
  headlineValue?: string
  headlineDelta?: string
  rangeData?: ChartRangeData
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
  openDeposit,
  openWithdraw,
  primaryActionLabel,
  secondaryActionLabel,
}: {
  openDeposit?: (token: typeof TOKENS[number]) => void
  openWithdraw?: (token: typeof TOKENS[number]) => void
  primaryActionLabel: string
  secondaryActionLabel: string
}): PortfolioHeroAction[] {
  return [
    { id: "primary", label: primaryActionLabel, icon: ArrowUpload24Filled, onClick: () => openDeposit?.(TOKENS[0]) },
    { id: "secondary", label: secondaryActionLabel, icon: ArrowDownload24Filled, onClick: () => openWithdraw?.(TOKENS[0]) },
  ]
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
    <div className="bg-surface-raised p-3.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label} <InfoTip text={helpText} />
      </div>
      <div className="font-data text-[18px] font-medium tabular-nums text-[#01AACF]">{value}</div>
    </div>
  )
}

export function PortfolioHero({
  openDeposit,
  openWithdraw,
  tabs,
  headlineValue,
  headlineDelta,
  rangeData = DEFAULT_RANGE_DATA,
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
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>("all")
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

  const resolvedHeadlineValue = selectedNetwork === "all" ? (headlineValue ?? activeNetwork.balance) : activeNetwork.balance

  // Delta + color track the active range's real trend, so a dip turns red.
  const activePoints = displayRangeData[activeRange]
  const trendTone = resolveSeriesTone(activePoints)
  const trendChange = resolveSeriesChange(activePoints)
  const resolvedHeadlineDelta = `$${trendChange.changeAbs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} (${Math.abs(trendChange.pct).toFixed(2)}%) ${RANGE_PERIOD_WORD[activeRange]}`

  const actions = buildActions({
    openDeposit,
    openWithdraw,
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

      <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-2.5 sm:space-y-3">
          <HeroBalanceDisplay
            value={resolvedHeadlineValue}
            delta={headlineDelta ?? resolvedHeadlineDelta}
            deltaTone={trendTone}
            hidden={!showDollarAmounts}
          />
          <HeroChartSection
            rangeData={displayRangeData}
            activeRange={activeRange}
            onRangeChange={setActiveRange}
            gradientId="portfolioHeroFill"
            tone={trendTone}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:pt-[28px]">
          <PortfolioHeroActions actions={actions} />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-radius-md border border-border bg-border">
            <StatCard label={statOneLabel} value={statOneValue} helpText={statOneHelpText} />
            <StatCard label={statTwoLabel} value={statTwoValue} helpText={statTwoHelpText} />
          </div>
        </div>
      </div>
    </section>
  )
}

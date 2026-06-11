"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { ArrowDownCircle, Landmark, MoreHorizontal, Send } from "lucide-react"
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
import { PortfolioHeroActions } from "./portfolio-hero-actions"
import { PortfolioHeroHeader } from "./portfolio-hero-header"
import { PORTFOLIO_NETWORKS } from "./portfolio-network-data"
import type { NetworkId, PortfolioHeroAction, PortfolioHeroActionId } from "./types"

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
  actionIds?: readonly PortfolioHeroActionId[]
  walletName?: string
}

function buildActions({
  actionIds,
  openDeposit,
  openWithdraw,
  primaryActionLabel,
  secondaryActionLabel,
}: {
  actionIds?: readonly PortfolioHeroActionId[]
  openDeposit?: (token: typeof TOKENS[number]) => void
  openWithdraw?: (token: typeof TOKENS[number]) => void
  primaryActionLabel: string
  secondaryActionLabel: string
}): PortfolioHeroAction[] {
  const catalog: Record<PortfolioHeroActionId, PortfolioHeroAction> = {
    send: { id: "send", label: "Send", icon: Send, onClick: () => undefined },
    receive: { id: "receive", label: "Receive", icon: ArrowDownCircle, onClick: () => undefined },
    buy: { id: "buy", label: "Buy", icon: Landmark, onClick: () => openDeposit?.(TOKENS[0]) },
    more: { id: "more", label: "More", icon: MoreHorizontal, onClick: () => openWithdraw?.(TOKENS[0]) },
  }

  if (!actionIds || actionIds.length === 0) {
    return [
      { id: "buy", label: primaryActionLabel, icon: Landmark, onClick: () => openDeposit?.(TOKENS[0]) },
      { id: "more", label: secondaryActionLabel, icon: MoreHorizontal, onClick: () => openWithdraw?.(TOKENS[0]) },
    ]
  }

  return actionIds.map((id) => catalog[id])
}

export function PortfolioHero({
  openDeposit,
  openWithdraw,
  tabs,
  headlineValue,
  rangeData = DEFAULT_RANGE_DATA,
  primaryActionLabel = "Deposit",
  secondaryActionLabel = "Withdraw",
  actionIds,
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
    actionIds,
    openDeposit,
    openWithdraw,
    primaryActionLabel,
    secondaryActionLabel,
  })

  return (
    <section className="mb-6 min-w-0 sm:mb-10">
      <PortfolioHeroHeader
        walletName={walletName}
        selectedNetwork={selectedNetwork}
        onNetworkChange={setSelectedNetwork}
      />

      {tabs ? <div className="mb-5 sm:mb-8">{tabs}</div> : null}

      <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_272px] lg:gap-8">
        <div className="min-w-0 space-y-3 sm:space-y-4">
          <HeroBalanceDisplay
            value={resolvedHeadlineValue}
            delta={resolvedHeadlineDelta}
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

        <PortfolioHeroActions actions={actions} />
      </div>
    </section>
  )
}

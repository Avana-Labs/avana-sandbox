import type { ChartPoint, ChartRangeData, ChartRangeOption } from "@/app/components/charts"
import { CHART_RANGE_LABELS, CHART_RANGE_OPTIONS, buildRangeData } from "@/app/components/charts"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { calculateMaxWithdrawable, calculateTotalApy } from "@/app/lib/lend-engine/formulas"
import type { LendMarket, LendSystemState } from "@/app/lib/lend-engine"
import type { LendPageData } from "@/app/lib/data/providers/lend/types"
import type { PortfolioLendTabData, PortfolioStrategyBucket } from "@/app/lib/data/providers/portfolio/types"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/catalog/lend/asset-groups"
import { LEND_FEATURED_ASSETS, LEND_FEATURED_SEQUENCE } from "@/app/lib/data/catalog/lend/featured-assets"
import { getLocalAssetIcon } from "@/app/lib/local-asset-icons"
import { LEND_MARKET_CATALOG } from "./catalog"
import type { LendTransactionHistoryItem, LendWalletReadSnapshot, LendYieldSnapshot } from "./contracts"

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatTokenQuantity(value: number, symbol: string) {
  if (value > 0 && value < 0.01) return `<0.01 ${symbol}`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${symbol}`
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K ${symbol}`
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`
}

function formatPositiveUsd(value: number) {
  return value > 0 && value < 0.01 ? "<$0.01" : formatCompactUsd(value)
}

export type LendFeaturedSnapshot = {
  marketId: string
  symbol: string
  displayName: string
  eyebrow: string
  apyLabel: string
  apyPct: number
  /** Supply APY as a percent — matches the list-row "Supply APY" column so the card and table agree. */
  supplyApyPct: number
  tone: "green" | "blue"
  iconUrl: string
  href: string
  sparklinePath?: string
}

export type LendMarketRow = {
  marketId: string
  href: string
  asset: string
  assetName: string
  logoSrc?: string
  supplyApyLabel: string
  rewardsApyLabel: string
  totalApyLabel: string
  totalSuppliedLabel: string
  availableLiquidityLabel: string
  utilizationLabel: string
  reserveFactorLabel: string
  status: string
  supplyApy: number
  rewardsApy: number
  totalApy: number
  totalSupplied: number
  availableLiquidity: number
  utilization: number
  reserveFactor: number
}

export function buildLendFeaturedSnapshots(markets: LendMarket[]): LendFeaturedSnapshot[] {
  return LEND_FEATURED_SEQUENCE.map((featuredId) => {
    const featured = LEND_FEATURED_ASSETS[featuredId]
    const market = markets.find((entry) => entry.asset.symbol.toUpperCase() === featured.symbol.toUpperCase())
    const apy = market?.totalApy ?? featured.apy / 100
    const supplyApy = market?.supplyApy ?? featured.apy / 100
    return {
      marketId: market?.marketId ?? featuredId,
      symbol: featured.symbol,
      displayName: featured.displayName,
      eyebrow: featured.eyebrow,
      apyLabel: formatPct(apy),
      apyPct: apy * 100,
      supplyApyPct: supplyApy * 100,
      tone: featured.tone,
      iconUrl: featured.iconUrl,
      href: `/lend/markets/${market?.marketId ?? featuredId}`,
      sparklinePath: featured.path,
    }
  })
}

export function catalogMarketToRow(market: LendMarket): LendMarketRow {
  return {
    marketId: market.marketId,
    href: `/lend/markets/${market.marketId}`,
    asset: market.asset.symbol,
    assetName: market.asset.name,
    logoSrc: getLocalAssetIcon(market.asset.symbol),
    supplyApyLabel: formatPct(market.supplyApy),
    rewardsApyLabel: formatPct(market.rewardsApy),
    totalApyLabel: formatPct(market.totalApy),
    totalSuppliedLabel: formatCompactUsd(market.totalSupplied * market.assetPriceUsd),
    availableLiquidityLabel: formatCompactUsd(market.availableLiquidity * market.assetPriceUsd),
    utilizationLabel: formatPct(market.utilization),
    reserveFactorLabel: formatPct(market.reserveFactor),
    status: market.status,
    supplyApy: market.supplyApy,
    rewardsApy: market.rewardsApy,
    totalApy: market.totalApy,
    totalSupplied: market.totalSupplied,
    availableLiquidity: market.availableLiquidity,
    utilization: market.utilization,
    reserveFactor: market.reserveFactor,
  }
}

export function buildLendPageData(_walletId: string, state?: LendSystemState): LendPageData {
  const markets = state ? Object.values(state.markets) : LEND_MARKET_CATALOG
  const marketRows = [...markets].sort((a, b) => a.rank - b.rank).map(catalogMarketToRow)
  const assetGroups = LEND_ASSET_GROUPS.map((group) => ({
    ...group,
    rows: group.rows.map((row) => {
      const market = markets.find((entry) => entry.asset.symbol.toUpperCase() === row.symbol.toUpperCase())
      const rowMarket = market ? catalogMarketToRow(market) : null
      return {
        ...row,
        marketId: rowMarket?.marketId,
        href: rowMarket?.href,
        apy: rowMarket?.totalApyLabel ?? row.apy,
        apyValue: rowMarket ? rowMarket.totalApy * 100 : row.apyValue,
        supplyApyLabel: rowMarket?.supplyApyLabel,
        rewardsApyLabel: rowMarket?.rewardsApyLabel ?? "0.00%",
        totalApyLabel: rowMarket?.totalApyLabel ?? row.apy,
        supplyApyValue: rowMarket?.supplyApy ?? row.apyValue / 100,
        rewardsApyValue: rowMarket?.rewardsApy ?? 0,
        totalDepositsLabel: market ? formatTokenQuantity(market.totalSupplied, market.asset.symbol) : undefined,
        totalDepositsSecondaryLabel: market
          ? formatPositiveUsd(market.totalSupplied * market.assetPriceUsd)
          : undefined,
        totalDepositsSortValue: market ? market.totalSupplied * market.assetPriceUsd : undefined,
        utilizationLabel: rowMarket?.utilizationLabel ?? "—",
        utilizationValue: rowMarket?.utilization ?? 0,
        availableLiquidityLabel: market
          ? formatTokenQuantity(market.availableLiquidity, market.asset.symbol)
          : undefined,
        availableLiquiditySecondaryLabel: market
          ? formatPositiveUsd(market.availableLiquidity * market.assetPriceUsd)
          : undefined,
        availableLiquiditySortValue: market ? market.availableLiquidity * market.assetPriceUsd : undefined,
        reserveFactorLabel: rowMarket?.reserveFactorLabel ?? "—",
        reserveFactorValue: rowMarket?.reserveFactor ?? 0,
        status: rowMarket?.status ?? "active",
      }
    }),
  }))

  return {
    tokens: [],
    markets: markets.map((market) => ({
      symbol: market.asset.symbol,
      name: market.asset.name,
      apy: market.totalApy * 100,
      apyChange24h: 0,
      tvl: formatCompactUsd(market.totalSupplied * market.assetPriceUsd),
      tvlUsd: market.totalSupplied * market.assetPriceUsd,
      utilization: Math.round(market.utilization * 100),
      type: market.riskTier,
      protocol: market.asset.symbol,
      color: "text-foreground",
      bg: "bg-card",
      soon: market.status !== "active",
      event: null,
    })),
    activity: [],
    chartSeries: [],
    featuredAssets: LEND_FEATURED_ASSETS,
    featuredSequence: LEND_FEATURED_SEQUENCE,
    featuredSnapshots: buildLendFeaturedSnapshots(markets),
    assetGroups,
    marketRows,
  }
}

const STRATEGY_TIERS = [
  {
    riskTier: "low" as const,
    tone: "conservative" as const,
    title: "Conservative Strategy",
    description: "Stable assets with lower risk",
  },
  {
    riskTier: "medium" as const,
    tone: "moderate" as const,
    title: "Moderate Strategy",
    description: "Balanced risk-reward ratio",
  },
  {
    riskTier: "high" as const,
    tone: "aggressive" as const,
    title: "Aggressive Strategy",
    description: "High risk, high potential returns",
  },
]

/**
 * Group the live lend markets into risk-tiered opportunity buckets so the
 * dashboard "Lending Opportunities" reflect real market APYs/TVL rather than a
 * hardcoded catalog. Empty tiers are dropped.
 */
// Which strategy a market belongs to is driven by its *yield*, not its collateral
// risk tier. A "stable" asset paying 30% APY is not conservative — a high yield
// implies risk — so bucket by APY to keep the risk-reward narrative honest.
function strategyTierForApyPct(apyPct: number): "low" | "medium" | "high" {
  if (apyPct < 8) return "low"
  if (apyPct < 18) return "medium"
  return "high"
}

export function buildLendStrategyBuckets(markets: LendMarket[]): PortfolioStrategyBucket[] {
  const buckets: PortfolioStrategyBucket[] = []
  for (const tier of STRATEGY_TIERS) {
    const tierMarkets = markets
      .filter((market) => market.status !== "paused" && strategyTierForApyPct(market.totalApy * 100) === tier.riskTier)
      .sort((a, b) => b.totalApy - a.totalApy)
    if (tierMarkets.length === 0) continue

    const apys = tierMarkets.map((market) => market.totalApy * 100)
    const minApy = Math.min(...apys)
    const maxApy = Math.max(...apys)
    const apyRangeLabel =
      minApy === maxApy ? `${maxApy.toFixed(1)}% APY` : `${minApy.toFixed(1)}-${maxApy.toFixed(1)}% APY range`

    buckets.push({
      title: tier.title,
      description: tier.description,
      apyRangeLabel,
      tone: tier.tone,
      pools: tierMarkets.map((market) => ({
        name: `Aave ${market.asset.symbol}`,
        apyPct: market.totalApy * 100,
        tvlUsd: market.totalSupplied * market.assetPriceUsd,
        isUp: market.rewardsApy > 0,
        allocationUsd: 0,
      })),
    })
  }
  return buckets
}

export function buildPortfolioLendData(
  walletId: string,
  state: LendSystemState,
  history: LendTransactionHistoryItem[] = [],
): PortfolioLendTabData {
  const walletPositions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  const positions = walletPositions.filter(
    (position) => position.walletId === walletId && position.status === "active",
  )
  const claimableRewardsUsd = walletPositions.reduce((sum, position) => sum + position.rewardsEarnedUsd, 0)
  const closedRewardsUsd = walletPositions
    .filter((position) => position.status === "closed")
    .reduce((sum, position) => sum + position.rewardsEarnedUsd, 0)

  const investments = positions.map((position) => {
    const market = state.markets[position.marketId]!
    const maxWithdrawable = calculateMaxWithdrawable(position.currentSuppliedAmount, market.availableLiquidity)
    const walletBalance = state.walletBalances[walletId]?.[position.marketId] ?? 0
    return {
      id: position.positionId,
      marketId: position.marketId,
      symbol: position.asset,
      name: market.asset.name,
      balance: position.currentSuppliedAmount,
      priceUsd: market.assetPriceUsd,
      suppliedUsd: position.suppliedValueUsd,
      principalUsd: position.principalAmount * market.assetPriceUsd,
      earnedUsd: position.interestEarned * market.assetPriceUsd + position.rewardsEarnedUsd,
      dailyEarnedUsd: (position.suppliedValueUsd * market.totalApy) / 365,
      apyPct: market.totalApy * 100,
      principalAmount: position.principalAmount,
      interestEarned: position.interestEarned,
      availableToWithdraw: maxWithdrawable,
      walletBalance,
      status: position.status,
    }
  })

  return {
    investments,
    positions: investments,
    strategyBuckets: buildLendStrategyBuckets(Object.values(state.markets)),
    history: buildLendActivityHistory(walletId, history, state),
    rewardsSummary: {
      claimableUsd: claimableRewardsUsd,
      totalEarnedUsd: investments.reduce((sum, item) => sum + item.earnedUsd, 0) + closedRewardsUsd,
    },
  }
}

export function buildLendWalletSnapshot(
  walletId: string,
  state: LendSystemState,
  transactionHistory: LendTransactionHistoryItem[],
): LendWalletReadSnapshot {
  const portfolio = buildPortfolioLendData(walletId, state, transactionHistory)
  const totalSuppliedUsd = portfolio.investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const totalEarnedUsd = portfolio.rewardsSummary?.totalEarnedUsd ?? portfolio.investments.reduce((sum, item) => sum + item.earnedUsd, 0)
  const rewardsEarnedUsd =
    portfolio.rewardsSummary?.claimableUsd ??
    portfolio.investments.reduce((sum, item) => sum + (item.earnedUsd - ((item.interestEarned ?? 0) * item.priceUsd)), 0)
  const averageApy =
    portfolio.investments.length === 0
      ? 0
      : portfolio.investments.reduce((sum, item) => sum + item.apyPct, 0) / portfolio.investments.length / 100

  return {
    walletId,
    transactionHistory,
    metrics: {
      suppliedAmount: portfolio.investments.reduce((sum, item) => sum + item.balance, 0),
      suppliedValueUsd: totalSuppliedUsd,
      principalAmount: portfolio.investments.reduce((sum, item) => sum + (item.principalAmount ?? 0), 0),
      interestEarned: portfolio.investments.reduce((sum, item) => sum + (item.interestEarned ?? 0), 0),
      rewardsEarnedUsd,
      totalEarnedUsd,
      currentApy: averageApy,
    },
    yieldSnapshots: buildLendYieldSnapshots(state),
  }
}

export function buildLendYieldSnapshots(state: LendSystemState): LendYieldSnapshot[] {
  return Object.values(state.markets).map((market) => ({
    marketId: market.marketId,
    asset: market.asset.symbol,
    supplyApy: market.supplyApy,
    rewardsApy: market.rewardsApy,
    totalApy: calculateTotalApy(market.supplyApy, market.rewardsApy),
    utilization: market.utilization,
    availableLiquidity: market.availableLiquidity,
    totalSupplied: market.totalSupplied,
    capturedAt: state.now,
  }))
}

export function buildLendActivityHistory(
  walletId: string,
  history: LendTransactionHistoryItem[],
  state?: LendSystemState,
): PortfolioLendTabData["history"] {
  return history
    .filter((item) => item.walletId === walletId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      product: "lend" as const,
      kind:
        item.kind === "deposit"
          ? ("supply" as const)
          : item.kind === "withdraw"
            ? ("withdraw" as const)
            : ("claim" as const),
      status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: item.kind === "claim" ? item.amount : item.amount * (state?.markets[item.marketId]?.assetPriceUsd ?? 0),
      primaryLabel:
        item.kind === "deposit"
          ? "Simulated deposit"
          : item.kind === "withdraw"
            ? "Simulated withdraw"
            : "Simulated rewards claim",
      secondaryLabel: item.kind === "claim" ? `${item.amount.toFixed(2)} USD rewards` : `${item.amount.toFixed(4)} ${item.asset}`,
      txHash: item.hash,
    }))
}

function buildLendRangeData(data: PortfolioLendTabData): ChartRangeData {
  const totalSuppliedUsd = data.investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const totalEarnedUsd = data.investments.reduce((sum, item) => sum + item.earnedUsd, 0)
  const confirmedHistory = [...data.history]
    .filter((item) => item.status === "confirmed")
    .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())

  if (totalSuppliedUsd <= 0 && confirmedHistory.length === 0) {
    return buildRangeData(0, 42)
  }

  const netFlowUsd = confirmedHistory.reduce((sum, item) => {
    return sum + (item.kind === "supply" ? item.amountUsd : -item.amountUsd)
  }, 0)
  const baseSuppliedUsd = Math.max(0, totalSuppliedUsd - netFlowUsd)
  const rangeStartValue = Math.max(0, baseSuppliedUsd)
  const rangeEndValue = totalSuppliedUsd

  return CHART_RANGE_OPTIONS.reduce((accumulator, range) => {
    accumulator[range] = buildRangePoints({
      range,
      history: confirmedHistory,
      startValue: rangeStartValue,
      endValue: rangeEndValue,
      earnedUsd: totalEarnedUsd,
    })
    return accumulator
  }, {} as ChartRangeData)
}

function buildRangePoints(params: {
  range: ChartRangeOption
  history: PortfolioLendTabData["history"]
  startValue: number
  endValue: number
  earnedUsd: number
}): ChartPoint[] {
  const labels = CHART_RANGE_LABELS[params.range]
  const pointCount = 63
  const lastLabel = labels[labels.length - 1] ?? "Now"
  const points = Array.from({ length: pointCount }, (_, index) => ({
    time: index,
    value: params.startValue,
    label:
      labels[Math.min(labels.length - 1, Math.floor((index / Math.max(1, pointCount - 1)) * labels.length))] ??
      lastLabel,
  }))

  if (points.length === 0) return points

  const historyCount = params.history.length
  for (const [index, item] of params.history.entries()) {
    const pointIndex = historyCount === 1 ? Math.floor(pointCount * 0.6) : Math.round((index / Math.max(1, historyCount - 1)) * (pointCount - 2))
    const delta = item.kind === "supply" ? item.amountUsd : -item.amountUsd
    for (let cursor = pointIndex; cursor < points.length; cursor += 1) {
      points[cursor]!.value = Math.max(0, points[cursor]!.value + delta)
    }
  }

  const earnedStep = points.length > 1 ? params.earnedUsd / (points.length - 1) : 0
  for (let index = 0; index < points.length; index += 1) {
    points[index]!.value = Math.max(0, points[index]!.value + earnedStep * index)
  }

  points[0]!.value = params.startValue
  points[points.length - 1]!.value = params.endValue
  return points.map((point, index) => ({
    ...point,
    time: index,
    value: Math.round(point.value * 100) / 100,
  }))
}

export { buildLendRangeData }

export function mapLendHistoryToDetailRows(
  history: LendTransactionHistoryItem[],
  assetSymbol: string,
) {
  const now = Date.now()
  return history.map((item) => ({
    id: item.id,
    at: new Date(item.timestamp).toISOString(),
    timeLabel: formatRelativeAge(now - item.timestamp),
    kind: item.kind,
    amountLabel: `${item.amount.toFixed(4)} ${assetSymbol}`,
    counterpartyLabel: assetSymbol,
    walletLabel: "Sandbox wallet",
    txHashShort: item.hash.slice(0, 10),
  }))
}

function formatRelativeAge(elapsedMs: number) {
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000))
  if (totalSeconds < 60) return `${totalSeconds}s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.floor(totalMinutes / 60)
  if (totalHours < 24) return `${totalHours}h`
  return `${Math.floor(totalHours / 24)}d`
}

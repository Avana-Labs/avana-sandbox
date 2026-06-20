import type { ChartPoint, ChartRangeData, ChartRangeOption } from "@/app/components/charts"
import { CHART_RANGE_LABELS, CHART_RANGE_OPTIONS, buildRangeData } from "@/app/components/charts"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { calculateMaxWithdrawable, calculateTotalApy } from "@/app/lib/lend-engine/formulas"
import type { LendMarket, LendSystemState } from "@/app/lib/lend-engine"
import type { LendPageData } from "@/app/lib/data/providers/lend/types"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio/types"
import { LEND_ASSET_GROUPS } from "@/app/lib/data/mock/shared/lend/asset-groups"
import { LEND_FEATURED_ASSETS, LEND_FEATURED_SEQUENCE } from "@/app/lib/data/mock/shared/lend/featured-assets"
import { getLocalAssetIcon } from "@/app/lib/local-asset-icons"
import { LEND_MARKET_CATALOG } from "./catalog"
import type { LendTransactionHistoryItem, LendWalletReadSnapshot, LendYieldSnapshot } from "./contracts"

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

export type LendFeaturedSnapshot = {
  marketId: string
  symbol: string
  displayName: string
  eyebrow: string
  apyLabel: string
  apyPct: number
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
    return {
      marketId: market?.marketId ?? featuredId,
      symbol: featured.symbol,
      displayName: featured.displayName,
      eyebrow: featured.eyebrow,
      apyLabel: formatPct(apy),
      apyPct: apy * 100,
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
        utilizationLabel: rowMarket?.utilizationLabel ?? "—",
        utilizationValue: rowMarket?.utilization ?? 0,
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

export function buildPortfolioLendData(
  walletId: string,
  state: LendSystemState,
  history: LendTransactionHistoryItem[] = [],
): PortfolioLendTabData {
  const positions = Object.values(state.positions).filter(
    (position) => position.walletId === walletId && position.status === "active",
  )

  const investments = positions.map((position) => {
    const market = state.markets[position.marketId]!
    const maxWithdrawable = calculateMaxWithdrawable(position.currentSuppliedAmount, market.availableLiquidity)
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
      status: position.status,
    }
  })

  return {
    investments,
    positions: investments,
    strategyBuckets: [],
    history: buildLendActivityHistory(walletId, history, state),
  }
}

export function buildLendWalletSnapshot(
  walletId: string,
  state: LendSystemState,
  transactionHistory: LendTransactionHistoryItem[],
): LendWalletReadSnapshot {
  const portfolio = buildPortfolioLendData(walletId, state, transactionHistory)
  const totalSuppliedUsd = portfolio.investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
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
      rewardsEarnedUsd: portfolio.investments.reduce((sum, item) => sum + (item.earnedUsd - ((item.interestEarned ?? 0) * item.priceUsd)), 0),
      totalEarnedUsd: portfolio.investments.reduce((sum, item) => sum + item.earnedUsd, 0),
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
      kind: item.kind === "deposit" ? ("open" as const) : ("reduce" as const),
      status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: item.amount * (state?.markets[item.marketId]?.assetPriceUsd ?? 0),
      primaryLabel: item.kind === "deposit" ? "Simulated deposit" : "Simulated withdraw",
      secondaryLabel: `${item.amount.toFixed(4)} ${item.asset}`,
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
    return sum + (item.kind === "open" ? item.amountUsd : -item.amountUsd)
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
  const pointCount = params.range === "1H" ? 24 : 63
  const points = Array.from({ length: pointCount }, (_, index) => ({
    time: index,
    value: params.startValue,
    label: labels[Math.min(labels.length - 1, Math.floor((index / Math.max(1, pointCount - 1)) * labels.length))] ?? labels.at(-1) ?? "Now",
  }))

  if (points.length === 0) return points

  const historyCount = params.history.length
  for (const [index, item] of params.history.entries()) {
    const pointIndex = historyCount === 1 ? Math.floor(pointCount * 0.6) : Math.round((index / Math.max(1, historyCount - 1)) * (pointCount - 2))
    const delta = item.kind === "open" ? item.amountUsd : -item.amountUsd
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

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
    markets: markets.slice(0, 6).map((market) => ({
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
      earnedUsd: position.interestEarned * market.assetPriceUsd,
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
    history: buildLendActivityHistory(walletId, history),
  }
}

export function buildLendWalletSnapshot(
  walletId: string,
  state: LendSystemState,
  transactionHistory: LendTransactionHistoryItem[],
): LendWalletReadSnapshot {
  const portfolio = buildPortfolioLendData(walletId, state, transactionHistory)
  const totalSuppliedUsd = portfolio.investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const totalEarnedUsd = portfolio.investments.reduce((sum, item) => sum + item.earnedUsd, 0)
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
): PortfolioLendTabData["history"] {
  return history
    .filter((item) => item.walletId === walletId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      product: "lend" as const,
      kind: item.kind === "deposit" ? ("open" as const) : ("reduce" as const),
      status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: 0,
      primaryLabel: item.kind === "deposit" ? "Simulated deposit" : "Simulated withdraw",
      secondaryLabel: `${item.amount.toFixed(4)} ${item.asset}`,
      txHash: item.hash,
    }))
}

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

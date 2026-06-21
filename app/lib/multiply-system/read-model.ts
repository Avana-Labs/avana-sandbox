import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { MultiplyMarketRecord, MultiplySystemState } from "@/app/lib/multiply-engine"
import { calculateMaxLeverageApy, calculateTheoreticalMaxMultiplier } from "@/app/lib/multiply-engine"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { MULTIPLY_TOKEN_BORROW_APYS, MULTIPLY_TOKEN_LOGOS, MULTIPLY_TOKEN_SUPPLY_APYS } from "@/app/lib/multiply-sim"
import type { MultiplyMarketRow } from "@/app/lib/multiply-sim"
import { MULTIPLY_MARKET_CATALOG } from "./catalog"
import type { MultiplyTransactionHistoryItem, MultiplyTransactionResult, MultiplyWalletReadSnapshot } from "./contracts"
import { buildMockMultiplyRiskSnapshots } from "./mock"

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatFactor(value: number) {
  return `${value.toFixed(2)}x`
}

export type MultiplyTrendingSnapshot = {
  marketId: string
  label: string
  href: string
  maxLeverageLabel: string
  apyLabel: string
  apyPct: number
  availableLabel: string
  availableUsd: number
  collateralSymbol: string
  borrowSymbol: string
  collateralLogo: string
  borrowLogo: string
}

export function buildMultiplyTrendingSnapshots(markets: MultiplyMarketRecord[]): MultiplyTrendingSnapshot[] {
  return [...markets]
    .map((market) => {
      const maxLeverageApy = calculateMaxLeverageApy({
        supplyApy: market.economics.supplyApy,
        borrowApy: market.economics.borrowApy,
        safeMaxMultiplier: market.risk.publicMaxMultiplier,
      })
      const collateralSymbol = market.collateralAsset.symbol
      const borrowSymbol = market.borrowAsset.symbol

      return {
        maxLeverageApy,
        snapshot: {
          marketId: market.id,
          label: `${collateralSymbol}-${borrowSymbol}`,
          href: `/multiply/markets/${market.id}`,
          maxLeverageLabel: formatFactor(
            Math.max(market.risk.hardMaxMultiplier, calculateTheoreticalMaxMultiplier(market.risk.liquidationThreshold)),
          ),
          apyPct: maxLeverageApy * 100,
          apyLabel: formatPct(maxLeverageApy),
          availableUsd: market.economics.availableLiquidityUsd,
          availableLabel: formatCompactUsd(market.economics.availableLiquidityUsd),
          collateralSymbol,
          borrowSymbol,
          collateralLogo: MULTIPLY_TOKEN_LOGOS[collateralSymbol as keyof typeof MULTIPLY_TOKEN_LOGOS] ?? "",
          borrowLogo: MULTIPLY_TOKEN_LOGOS[borrowSymbol as keyof typeof MULTIPLY_TOKEN_LOGOS] ?? "",
        },
      }
    })
    .filter((entry) => entry.maxLeverageApy > 0)
    .sort((left, right) => right.maxLeverageApy - left.maxLeverageApy)
    .slice(0, 4)
    .map((entry) => entry.snapshot)
}

export function catalogMarketToRow(market: MultiplyMarketRecord): MultiplyMarketRow {
  const collateralSymbol = market.collateralAsset.symbol
  const borrowSymbol = market.borrowAsset.symbol
  const collateralLogo = MULTIPLY_TOKEN_LOGOS[collateralSymbol as keyof typeof MULTIPLY_TOKEN_LOGOS] ?? ""
  return {
    href: `/multiply/markets/${market.id}`,
    protocol: collateralSymbol,
    protocolLogo: collateralLogo,
    asset: borrowSymbol,
    kind: "Loop",
    apy: formatPct(market.economics.estimatedMaxApy),
    apyLabel: "Estimated max APY at public max multiplier",
    points: formatCompactUsd(market.economics.availableLiquidityUsd),
    rewardRows: [
      {
        label: `CF ${Math.round(market.risk.collateralFactor * 100)}% · LT ${Math.round(market.risk.liquidationThreshold * 100)}%`,
        value: formatFactor(market.risk.publicMaxMultiplier),
      },
      {
        label: "Recommended max",
        value: formatFactor(market.risk.recommendedMaxMultiplier),
      },
    ],
    collateralFactor: market.risk.collateralFactor,
    liquidationThreshold: market.risk.liquidationThreshold,
  }
}

export function buildMultiplyPageData(_walletId: string, state?: MultiplySystemState): MultiplyPageData {
  const markets = state ? Object.values(state.markets) : MULTIPLY_MARKET_CATALOG
  const lendRows = [...markets].sort((a, b) => a.rank - b.rank).map(catalogMarketToRow)

  return {
    markets: markets.slice(0, 5).map((market) => ({
      symbol: market.collateralAsset.symbol,
      name: market.collateralAsset.name,
      price: market.collateralAsset.priceUsd,
      funding: market.economics.borrowApy,
      change: market.economics.estimatedMaxApy * 100,
      volume: market.economics.availableLiquidityUsd,
      maxLeverage: market.risk.publicMaxMultiplier,
      longOi: 62,
      shortOi: 38,
    })),
    lendRows,
    trendingSnapshots: buildMultiplyTrendingSnapshots(markets),
    pageSize: 12,
    tokenBorrowApys: MULTIPLY_TOKEN_BORROW_APYS,
    tokenLogos: MULTIPLY_TOKEN_LOGOS,
    tokenSupplyApys: MULTIPLY_TOKEN_SUPPLY_APYS,
  }
}

export function buildPortfolioMultiplyData(
  walletId: string,
  state: MultiplySystemState,
  history: MultiplyTransactionHistoryItem[] = [],
): PortfolioMultiplyTabData {
  const positions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  const totalCollateralUsd = positions.reduce((sum, position) => sum + position.collateralValueUsd, 0)
  const totalDebtUsd = positions.reduce((sum, position) => sum + position.debtValueUsd, 0)
  const averageHealthFactor =
    positions.length === 0
      ? null
      : positions.reduce((sum, position) => sum + (position.healthFactor === "infinity" ? 99 : position.healthFactor), 0) /
        positions.length

  return {
    creditLines: {
      approvedUsd: totalCollateralUsd,
      liquidationThresholdUsd: totalCollateralUsd * 0.85,
      averageHealthFactor,
      currentLtvPct: totalCollateralUsd > 0 ? (totalDebtUsd / totalCollateralUsd) * 100 : 0,
      totalBorrowedUsd: totalDebtUsd,
      totalCollateralUsd,
    },
    lpCollaterals: positions.map((position) => {
      const market = state.markets[position.marketId]!
      return {
        id: position.id,
        marketId: position.marketId,
        label: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol}`,
        collateralToken: market.collateralAsset.symbol,
        borrowableToken: market.borrowAsset.symbol,
        multiplier: position.multiplier,
        protocol: "Avana Multiply",
        healthFactor: position.healthFactor === "infinity" ? 99 : position.healthFactor,
        collateralUsd: position.collateralValueUsd,
        borrowPowerUsd: Math.max(0, position.collateralValueUsd - position.debtValueUsd),
        debtUsd: position.debtValueUsd,
        ltvPct: position.ltv * 100,
        liquidationPriceUsd: position.liquidationPrice,
        netApyPct: position.netApy * 100,
        status: "open" as const,
      }
    }),
    positions: positions.map((position) => {
      const market = state.markets[position.marketId]!
      return {
        id: position.id,
        symbol: market.collateralAsset.symbol,
        label: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol}`,
        side: "long" as const,
        leverage: position.multiplier,
        collateralUsd: position.collateralValueUsd,
        exposureUsd: position.collateralValueUsd,
        pnlUsd: position.collateralValueUsd - position.debtValueUsd - position.collateralValueUsd / position.multiplier,
        pnlPct: position.netApy * 100,
        status: "open" as const,
      }
    }),
    openOrders: [],
    twapOrders: [],
    history: buildMultiplyActivityHistory(walletId, history),
  }
}

export function buildMultiplyWalletSnapshot(
  walletId: string,
  state: MultiplySystemState,
  transactionHistory: MultiplyTransactionHistoryItem[],
): MultiplyWalletReadSnapshot {
  const portfolio = buildPortfolioMultiplyData(walletId, state, transactionHistory)
  return {
    walletId,
    transactionHistory,
    metrics: {
      collateralValueUsd: portfolio.creditLines.totalCollateralUsd,
      debtValueUsd: portfolio.creditLines.totalBorrowedUsd,
      multiplier:
        portfolio.positions.length > 0
          ? portfolio.positions.reduce((sum, position) => sum + position.leverage, 0) / portfolio.positions.length
          : 1,
      ltv: portfolio.creditLines.currentLtvPct / 100,
      healthFactor: portfolio.creditLines.averageHealthFactor ?? "infinity",
      netApy:
        portfolio.positions.length > 0
          ? portfolio.positions.reduce((sum, position) => sum + position.pnlPct, 0) / portfolio.positions.length / 100
          : 0,
    },
    riskSnapshots: buildMockMultiplyRiskSnapshots(state).filter((snapshot) =>
      Object.values(state.positions).some((position) => position.walletId === walletId && position.marketId === snapshot.marketId),
    ),
  }
}

export function buildSyntheticReceipts(history: MultiplyTransactionHistoryItem[]): MultiplyTransactionResult[] {
  return history.map((item) => ({
    id: item.id,
    hash: item.hash,
    status: item.status,
    actionType: item.kind,
    simulated: item.simulated,
    timestamp: item.timestamp,
  }))
}

export function buildMultiplyActivityHistory(
  walletId: string,
  history: MultiplyTransactionHistoryItem[],
): PortfolioMultiplyTabData["history"] {
  return history
    .filter((item) => item.walletId === walletId)
    .map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      product: "multiply" as const,
      kind: item.kind === "multiply" ? ("open" as const) : ("reduce" as const),
      status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: item.amountUsd,
      primaryLabel: item.kind === "multiply" ? "Simulated multiply" : "Simulated deleverage",
      secondaryLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
      txHash: item.hash,
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

export function mapMultiplyHistoryToDetailRows(
  history: MultiplyTransactionHistoryItem[],
  collateralSymbol: string,
  borrowableSymbol: string,
) {
  const now = Date.now()
  return history.map((item) => ({
    id: item.id,
    at: new Date(item.timestamp).toISOString(),
    timeLabel: formatRelativeAge(now - item.timestamp),
    kind: item.kind === "multiply" ? ("open" as const) : ("reduce" as const),
    amountLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
    counterpartyLabel: `${collateralSymbol}/${borrowableSymbol}`,
    walletLabel: "Sandbox wallet",
    txHashShort: item.hash.slice(0, 10),
  }))
}

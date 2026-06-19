import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { MultiplyMarketRecord, MultiplySystemState } from "@/app/lib/multiply-engine"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { MULTIPLY_TOKEN_BORROW_APYS, MULTIPLY_TOKEN_LOGOS, MULTIPLY_TOKEN_SUPPLY_APYS } from "@/app/lib/multiply-sim"
import type { MultiplyMarketRow } from "@/app/lib/multiply-sim"
import { MULTIPLY_MARKET_CATALOG } from "./catalog"
import type { MultiplyTransactionHistoryItem, MultiplyWalletReadSnapshot } from "./contracts"

function formatPct(value: number) {
  return `${(value * 100).toFixed(2)}%`
}

function formatFactor(value: number) {
  return `${value.toFixed(2)}x`
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
        label: `CF ${Math.round(market.risk.maxLtv * 100)}% · LT ${Math.round(market.risk.liquidationThreshold * 100)}%`,
        value: formatFactor(market.risk.publicMaxMultiplier),
      },
      {
        label: "Public max",
        value: formatFactor(market.risk.publicMaxMultiplier),
      },
    ],
    collateralFactor: market.risk.maxLtv,
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
    pageSize: 12,
    tokenBorrowApys: MULTIPLY_TOKEN_BORROW_APYS,
    tokenLogos: MULTIPLY_TOKEN_LOGOS,
    tokenSupplyApys: MULTIPLY_TOKEN_SUPPLY_APYS,
  }
}

export function buildPortfolioMultiplyData(walletId: string, state: MultiplySystemState): PortfolioMultiplyTabData {
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
        label: `${market.collateralAsset.symbol}/${market.borrowAsset.symbol}`,
        collateralToken: market.collateralAsset.symbol,
        borrowableToken: market.borrowAsset.symbol,
        multiplier: position.multiplier,
        protocol: "Avana Multiply",
        healthFactor: position.healthFactor === "infinity" ? 99 : position.healthFactor,
        collateralUsd: position.collateralValueUsd,
        borrowPowerUsd: Math.max(0, position.collateralValueUsd - position.debtValueUsd),
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
    history: [],
  }
}

export function buildMultiplyWalletSnapshot(
  walletId: string,
  state: MultiplySystemState,
  transactionHistory: MultiplyTransactionHistoryItem[],
): MultiplyWalletReadSnapshot {
  const portfolio = buildPortfolioMultiplyData(walletId, state)
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
      healthFactor: portfolio.creditLines.averageHealthFactor,
      netApy:
        portfolio.positions.length > 0
          ? portfolio.positions.reduce((sum, position) => sum + position.pnlPct, 0) / portfolio.positions.length / 100
          : 0,
    },
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

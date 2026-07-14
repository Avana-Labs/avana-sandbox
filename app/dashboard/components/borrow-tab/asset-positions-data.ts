import { shouldUseOpenGateSession } from "@/app/lib/test-mode"

/**
 * DEV-ONLY dataset for the redesigned dashboard Borrow tab (asset-based Deposit /
 * Loans tables + expandable opportunities), modelled on the reference screenshots.
 *
 * The live wallet's borrow data is LP-pool shaped and doesn't carry the per-asset
 * fields this layout needs (wallet balance, deposit earnings, collateral factor,
 * per-asset available liquidity). Until real providers are wired, these fixtures
 * let us build and iterate on the UI. They only surface when the dev open gate is
 * on — hard-guarded against production builds in test-mode.ts. Remove once the real
 * asset-based borrow model exists.
 */

export type CollateralAssetRow = {
  id: string
  marketId: string
  symbol: string
  name: string
  /** Preformatted token amounts (they use the app's "<0.01" small-amount style). */
  walletBalanceToken: string
  walletBalanceUsd: number
  depositedToken: string
  depositedUsd: number
  apyPct: number
  earningsToken: string
  earningsUsd: number
  collateralEnabled: boolean
  collateralFactorPct: number
}

export type CollateralSummary = {
  depositedUsd: number
  collateralUsd: number
  netDepositApyPct: number
  interestEarnedUsd: number
}

export type DebtAssetRow = {
  id: string
  marketId: string
  symbol: string
  name: string
  borrowedToken: string
  borrowedUsd: number
  apyPct: number
  feesToken: string
  feesUsd: number
  availableLiquidityToken: string
  availableLiquidityUsd: number
}

export type DebtSummary = {
  borrowedUsd: number
  borrowApyPct: number
  borrowingPowerUsd: number
  interestOwedUsd: number
  /** Token symbols making up the loan collateral (rendered as stacked icons). */
  collateralSymbols: string[]
}

export type DashboardCollateralData = {
  summary: CollateralSummary
  rows: CollateralAssetRow[]
}

export type DashboardDebtData = {
  summary: DebtSummary
  rows: DebtAssetRow[]
}

/** A concentrated-liquidity LP position earning trading fees (Uniswap-style). */
export type TradingFeeRow = {
  id: string
  marketId: string
  poolLabel: string
  token0: string
  token1: string
  protocol: string
  /** Whether the current price sits inside the position's range (still earning fees). */
  inRange: boolean
  depositedToken: string
  depositedUsd: number
  apyPct: number
  feesEarnedToken: string
  feesEarnedUsd: number
}

export type TradingFeesSummary = {
  unclaimedFeesUsd: number
  feesClaimedUsd: number
  unrealizedPlUsd: number
  unrealizedPlPct: number
}

export type DashboardTradingFeesData = {
  summary: TradingFeesSummary
  rows: TradingFeeRow[]
}

const DEV_COLLATERAL: DashboardCollateralData = {
  summary: { depositedUsd: 5.8, collateralUsd: 4.8, netDepositApyPct: 1.43, interestEarnedUsd: 0.02 },
  rows: [
    {
      id: "collateral-eth",
      marketId: "eth",
      symbol: "ETH",
      name: "Ether",
      walletBalanceToken: "<0.01 ETH",
      walletBalanceUsd: 1.67,
      depositedToken: "<0.01 ETH",
      depositedUsd: 5.77,
      apyPct: 1.43,
      earningsToken: "<0.01 ETH",
      earningsUsd: 0.02,
      collateralEnabled: true,
      collateralFactorPct: 83,
    },
  ],
}

const DEV_DEBT: DashboardDebtData = {
  summary: { borrowedUsd: 0.64, borrowApyPct: 0.25, borrowingPowerUsd: 4.15, interestOwedUsd: 0, collateralSymbols: ["ETH"] },
  rows: [
    {
      id: "debt-cbbtc",
      marketId: "cbbtc",
      symbol: "cbBTC",
      name: "Coinbase WBTC",
      borrowedToken: "<0.01 cbBTC",
      borrowedUsd: 0.64,
      apyPct: 0.25,
      feesToken: "<0.01 cbBTC",
      feesUsd: 0,
      availableLiquidityToken: "13.97 cbBTC",
      availableLiquidityUsd: 893_150,
    },
  ],
}

const DEV_TRADING_FEES: DashboardTradingFeesData = {
  summary: { unclaimedFeesUsd: 33.8, feesClaimedUsd: 12.4, unrealizedPlUsd: 150.55, unrealizedPlPct: 23.06 },
  rows: [
    {
      id: "fees-usdc-usdt",
      marketId: "usdc-usdt",
      poolLabel: "USDC / USDT",
      token0: "USDC",
      token1: "USDT",
      protocol: "Uniswap v3",
      inRange: true,
      depositedToken: "2,140.00 LP",
      depositedUsd: 2_140,
      apyPct: 8.42,
      feesEarnedToken: "18.30 USDC",
      feesEarnedUsd: 18.3,
    },
    {
      id: "fees-weth-usdc",
      marketId: "weth-usdc",
      poolLabel: "WETH / USDC",
      token0: "WETH",
      token1: "USDC",
      protocol: "Uniswap v3",
      inRange: false,
      depositedToken: "0.85 LP",
      depositedUsd: 1_980,
      apyPct: 12.1,
      feesEarnedToken: "<0.01 WETH",
      feesEarnedUsd: 15.5,
    },
  ],
}

const EMPTY_COLLATERAL: DashboardCollateralData = {
  summary: { depositedUsd: 0, collateralUsd: 0, netDepositApyPct: 0, interestEarnedUsd: 0 },
  rows: [],
}

const EMPTY_DEBT: DashboardDebtData = {
  summary: { borrowedUsd: 0, borrowApyPct: 0, borrowingPowerUsd: 0, interestOwedUsd: 0, collateralSymbols: [] },
  rows: [],
}

const EMPTY_TRADING_FEES: DashboardTradingFeesData = {
  summary: { unclaimedFeesUsd: 0, feesClaimedUsd: 0, unrealizedPlUsd: 0, unrealizedPlPct: 0 },
  rows: [],
}

export function getDashboardCollateralData(): DashboardCollateralData {
  return shouldUseOpenGateSession() ? DEV_COLLATERAL : EMPTY_COLLATERAL
}

export function getDashboardDebtData(): DashboardDebtData {
  return shouldUseOpenGateSession() ? DEV_DEBT : EMPTY_DEBT
}

export function getDashboardTradingFeesData(): DashboardTradingFeesData {
  return shouldUseOpenGateSession() ? DEV_TRADING_FEES : EMPTY_TRADING_FEES
}

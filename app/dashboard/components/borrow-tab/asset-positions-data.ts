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

const EMPTY_COLLATERAL: DashboardCollateralData = {
  summary: { depositedUsd: 0, collateralUsd: 0, netDepositApyPct: 0, interestEarnedUsd: 0 },
  rows: [],
}

const EMPTY_DEBT: DashboardDebtData = {
  summary: { borrowedUsd: 0, borrowApyPct: 0, borrowingPowerUsd: 0, interestOwedUsd: 0, collateralSymbols: [] },
  rows: [],
}

export function getDashboardCollateralData(): DashboardCollateralData {
  return shouldUseOpenGateSession() ? DEV_COLLATERAL : EMPTY_COLLATERAL
}

export function getDashboardDebtData(): DashboardDebtData {
  return shouldUseOpenGateSession() ? DEV_DEBT : EMPTY_DEBT
}

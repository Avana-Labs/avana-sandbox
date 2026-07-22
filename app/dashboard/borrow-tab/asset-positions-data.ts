/**
 * Empty asset-position shapes for legacy Collateral/Debt/Fees panels.
 * Live Borrow tab uses session-backed SuppliesPanel/DebtsPanel instead — never
 * ship hardcoded DEV fixtures (ETH $5.80 / cbBTC $0.64) that disagree with Convex.
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
  return EMPTY_COLLATERAL
}

export function getDashboardDebtData(): DashboardDebtData {
  return EMPTY_DEBT
}

export function getDashboardTradingFeesData(): DashboardTradingFeesData {
  return EMPTY_TRADING_FEES
}

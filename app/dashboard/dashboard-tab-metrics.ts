import { accrueBorrowSystemState, calculateCreditMetrics, usd6ToNumber } from "@/app/lib/credit-engine"
import type { BorrowSystemState } from "@/app/lib/credit-engine"
import type { MultiplySystemState } from "@/app/lib/multiply-engine"
import { multiplyNetApyFraction } from "@/app/lib/multiply-system/read-model"
import { lendNetApyPct } from "@/app/lib/lend-system/read-model"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import type { BorrowSnapshot } from "@/app/dashboard/borrow-hero-state"
import type { PortfolioLendTabData, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"

export type DashboardOverviewMetrics = {
  netValueUsd: number
  totalBorrowedUsd: number
  liquidationBufferUsd: number
  riskPremiumPct: number
}

export type DashboardPerformanceMetrics = {
  poolCollateralUsd: number
  netApyPct: number
  interestEarnedUsd: number
  interestOwedUsd: number
}

export type DashboardTabMetrics = {
  overview: DashboardOverviewMetrics
  performance: DashboardPerformanceMetrics
}

/** Canonical wallet-level Borrow Balance snapshot (8 product metrics). */
export type BorrowBalanceMetrics = {
  netValueUsd: number
  collateralValueUsd: number
  totalBorrowedUsd: number
  availableToBorrowUsd: number
  healthFactor: number | null
  liquidationBufferUsd: number
  netApyPct: number
  interestOwedUsd: number
}

/** Canonical wallet-level Multiply Balance snapshot (8 product metrics). */
export type MultiplyBalanceMetrics = {
  netValueUsd: number
  positionValueUsd: number
  totalBorrowedUsd: number
  leverageX: number
  netApyPct: number
  healthFactor: number | null
  liquidationBufferUsd: number
  riskPremiumPct: number
}

const WAD = 10n ** 18n
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

function wadToPct(value: bigint) {
  return (Number(value) / Number(WAD)) * 100
}

function wadToNumber(value: bigint) {
  return Number(value) / Number(WAD)
}

/**
 * Snapshot-path Net APY: (Σ collateral×pairApr − Σ debt×borrowApr) / equity.
 * Never arithmetic-averages position APYs — that misstates multi-position wallets.
 */
export function estimateBorrowNetApyPctFromRows(
  totalCollateralUsd: number,
  totalBorrowedUsd: number,
  collateralPositions: SupplyRowContext[],
  debtPositions: DebtRowContext[],
): number {
  const equityUsd = totalCollateralUsd - totalBorrowedUsd
  if (equityUsd <= 0) return 0
  const annualYieldUsd = collateralPositions.reduce((sum, row) => sum + row.pool.collateralUsd * (row.pairApr / 100), 0)
  const annualCostUsd = debtPositions.reduce((sum, row) => sum + row.borrowedUsd * (row.borrowApr / 100), 0)
  return ((annualYieldUsd - annualCostUsd) / equityUsd) * 100
}

export function buildBorrowDashboardMetricsFromSnapshot(
  snapshot: BorrowSnapshot,
  collateralPositions: SupplyRowContext[] = [],
  debtPositions: DebtRowContext[] = [],
): DashboardTabMetrics {
  const totalCollateralUsd = snapshot.totalCollateralUsd
  const totalBorrowedUsd = snapshot.totalBorrowedUsd
  const interestEarnedUsd = collateralPositions.reduce((sum, row) => sum + row.feesUsd, 0)
  const interestOwedUsd = debtPositions.reduce((sum, row) => sum + row.accruedInterestUsd, 0)
  const netApyPct = estimateBorrowNetApyPctFromRows(
    totalCollateralUsd,
    totalBorrowedUsd,
    collateralPositions,
    debtPositions,
  )

  return {
    overview: {
      netValueUsd: totalCollateralUsd - totalBorrowedUsd,
      totalBorrowedUsd,
      liquidationBufferUsd: Math.max(0, snapshot.liquidationThresholdUsd - totalBorrowedUsd),
      riskPremiumPct: 0,
    },
    performance: {
      poolCollateralUsd: totalCollateralUsd,
      netApyPct,
      interestEarnedUsd,
      interestOwedUsd,
    },
  }
}

export function buildBorrowDashboardMetrics(
  state: BorrowSystemState,
  walletId: string,
  now: number = Date.now(),
): DashboardTabMetrics {
  const balance = buildBorrowBalanceMetrics(state, walletId, now)
  const accrued = accrueBorrowSystemState(state, now)
  const metrics = calculateCreditMetrics(accrued, walletId)

  return {
    overview: {
      netValueUsd: balance.netValueUsd,
      totalBorrowedUsd: balance.totalBorrowedUsd,
      liquidationBufferUsd: balance.liquidationBufferUsd,
      riskPremiumPct: wadToPct(metrics.riskPremiumWad),
    },
    performance: {
      poolCollateralUsd: balance.collateralValueUsd,
      netApyPct: balance.netApyPct,
      interestEarnedUsd: usd6ToNumber(metrics.interestEarnedUsd6),
      interestOwedUsd: balance.interestOwedUsd,
    },
  }
}

/**
 * Single aggregation pass over the credit engine for the wallet's Borrow Balance.
 * Available to Borrow uses collateral-factor credit limit − debt (protocol capacity),
 * never a liquidation-threshold heuristic. Health Factor is wallet-wide
 * liquidationValue / totalBorrowed (null when debt-free).
 */
export function buildBorrowBalanceMetrics(
  state: BorrowSystemState,
  walletId: string,
  now: number = Date.now(),
): BorrowBalanceMetrics {
  const accrued = accrueBorrowSystemState(state, now)
  const metrics = calculateCreditMetrics(accrued, walletId)
  const account = accrued.accounts[walletId]
  const returnedLpBalancesUsd6 = account
    ? Object.values(account.walletReturnedLpBalancesUsd6 ?? {}).reduce((sum, value) => sum + value, 0n)
    : 0n

  return {
    netValueUsd: usd6ToNumber(metrics.netAccountValueUsd6 + returnedLpBalancesUsd6),
    collateralValueUsd: usd6ToNumber(metrics.poolCollateralValueUsd6),
    totalBorrowedUsd: usd6ToNumber(metrics.totalBorrowedUsd6),
    availableToBorrowUsd: usd6ToNumber(metrics.availableCreditUsd6),
    healthFactor: metrics.totalBorrowedUsd6 > 0n ? wadToNumber(metrics.healthFactorWad) : null,
    liquidationBufferUsd: usd6ToNumber(metrics.liquidationBufferUsd6 > 0n ? metrics.liquidationBufferUsd6 : 0n),
    netApyPct: wadToPct(metrics.netApyWad),
    interestOwedUsd: usd6ToNumber(metrics.interestOwedUsd6),
  }
}

function weightedAverage(values: Array<{ weight: number; value: number }>) {
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) return 0
  return values.reduce((sum, entry) => sum + entry.weight * entry.value, 0) / totalWeight
}

export function buildMultiplyDashboardMetrics(
  state: MultiplySystemState,
  walletId: string,
  tabData: PortfolioMultiplyTabData,
): DashboardTabMetrics {
  const balance = buildMultiplyBalanceMetrics(state, walletId, tabData)

  const positions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  let interestEarnedUsd = 0
  let interestOwedUsd = 0

  for (const position of positions) {
    const market = state.markets[position.marketId]
    if (!market) continue
    const elapsedMs = Math.max(0, state.now - position.openedAt)
    const elapsedYears = elapsedMs / YEAR_MS
    interestEarnedUsd += position.collateralValueUsd * market.economics.supplyApy * elapsedYears
    interestOwedUsd += position.debtValueUsd * market.economics.borrowApy * elapsedYears
  }

  return {
    overview: {
      netValueUsd: balance.netValueUsd,
      totalBorrowedUsd: balance.totalBorrowedUsd,
      liquidationBufferUsd: balance.liquidationBufferUsd,
      riskPremiumPct: balance.riskPremiumPct,
    },
    performance: {
      poolCollateralUsd: balance.positionValueUsd,
      netApyPct: balance.netApyPct,
      interestEarnedUsd,
      interestOwedUsd,
    },
  }
}

/**
 * Single aggregation pass for Multiply Balance.
 * Position Value = gross loop collateral (Σ collateralValueUsd).
 * Leverage = Position Value / Net Value (1× when equity ≤ 0).
 * Health Factor = combined (Σ coll×LT) / Σ debt — not min/average of position HFs.
 */
export function buildMultiplyBalanceMetrics(
  state: MultiplySystemState,
  walletId: string,
  tabData: PortfolioMultiplyTabData,
): MultiplyBalanceMetrics {
  const positions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  const positionValueUsd = tabData.creditLines.totalCollateralUsd
  const totalBorrowedUsd = tabData.creditLines.totalBorrowedUsd
  const netValueUsd = positionValueUsd - totalBorrowedUsd
  const liquidationBufferUsd = Math.max(0, tabData.creditLines.liquidationThresholdUsd - totalBorrowedUsd)

  const riskPremiumPct =
    positions.length === 0
      ? 0
      : weightedAverage(
          positions.map((position) => {
            const market = state.markets[position.marketId]
            const borrowApy = market?.economics.borrowApy ?? 0
            const collateralFactor = market?.risk.collateralFactor ?? 0.75
            return {
              weight: position.debtValueUsd,
              value: borrowApy * (1 - collateralFactor) * 100,
            }
          }),
        )

  const netApyPct = multiplyNetApyFraction(positions) * 100
  const leverageX = netValueUsd > 0 ? positionValueUsd / netValueUsd : positions.length > 0 ? 1 : 0
  const healthFactor = totalBorrowedUsd > 0 ? tabData.creditLines.liquidationThresholdUsd / totalBorrowedUsd : null

  return {
    netValueUsd,
    positionValueUsd,
    totalBorrowedUsd,
    leverageX,
    netApyPct,
    healthFactor,
    liquidationBufferUsd,
    riskPremiumPct,
  }
}

export function buildLendDashboardMetrics(data: PortfolioLendTabData) {
  const balance = buildLendBalanceMetrics(data)
  const investments = data.investments ?? []
  const rewardsEarnedUsd = investments.reduce((sum, item) => sum + (item.rewardsEarnedUsd ?? 0), 0)
  const claimableRewardsUsd = data.rewardsSummary?.claimableUsd ?? 0

  return {
    totalSuppliedUsd: balance.totalSuppliedUsd,
    netApyPct: balance.netApyPct,
    interestEarnedUsd: balance.interestEarnedUsd,
    rewardsEarnedUsd,
    claimableRewardsUsd,
  }
}

/** Canonical wallet-level Lend Balance snapshot (8 growth-focused metrics). */
export type LendBalanceMetrics = {
  totalSuppliedUsd: number
  netApyPct: number
  interestEarnedUsd: number
  /** Interest earned ÷ principal supplied, as a percent. */
  yieldGeneratedPct: number
  projectedEarnings1dUsd: number
  projectedEarnings30dUsd: number
  projectedEarnings90dUsd: number
  projectedEarnings6mUsd: number
}

const LEND_PROJECTION_HORIZONS_DAYS = {
  d1: 1,
  d30: 30,
  d90: 90,
  /** Half-year using 182.5 days so 6M ≈ half of a 365-day year. */
  m6: 182.5,
} as const

/**
 * Simple forward earnings for one position — matches lend-engine / Ask AI accrual
 * (linear in time), not compound (1+apy)^(t/365).
 */
export function projectLendSimpleEarningsUsd(suppliedUsd: number, apyPct: number, days: number): number {
  if (!(suppliedUsd > 0) || !Number.isFinite(apyPct) || !(days > 0)) return 0
  return suppliedUsd * (apyPct / 100) * (days / 365)
}

/**
 * Portfolio projected earnings: Σ per-position simple projections.
 * Equivalent to TotalSupplied × NetAPY × (days/365) when Net APY is supplied-weighted.
 */
export function projectLendPortfolioEarningsUsd(
  investments: ReadonlyArray<{ suppliedUsd: number; apyPct: number }>,
  days: number,
): number {
  return investments.reduce((sum, item) => sum + projectLendSimpleEarningsUsd(item.suppliedUsd, item.apyPct, days), 0)
}

/**
 * Yield Generated = Interest Earned / Principal Supplied.
 * Principal prefers engine principalUsd (deposits − withdrawn principal), not current
 * Total Supplied (which already includes accrued interest).
 */
export function lendYieldGeneratedPct(
  interestEarnedUsd: number,
  investments: ReadonlyArray<{ suppliedUsd: number; principalUsd?: number; interestUsd?: number; earnedUsd?: number }>,
): number {
  const principalUsd = investments.reduce((sum, item) => {
    if (item.principalUsd != null && Number.isFinite(item.principalUsd)) {
      return sum + Math.max(0, item.principalUsd)
    }
    const interest = item.interestUsd ?? Math.max(0, (item.earnedUsd ?? 0) - 0)
    return sum + Math.max(0, item.suppliedUsd - interest)
  }, 0)
  if (!(principalUsd > 0) || !Number.isFinite(interestEarnedUsd)) return 0
  return (interestEarnedUsd / principalUsd) * 100
}

/**
 * Single aggregation pass for the Lend Balance dashboard.
 * Rewards remain available via buildLendDashboardMetrics for Claim UI — not on these cards.
 */
export function buildLendBalanceMetrics(data: PortfolioLendTabData): LendBalanceMetrics {
  const investments = data.investments ?? []
  const totalSuppliedUsd = investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const netApyPct = lendNetApyPct(investments)
  const interestEarnedUsd = investments.reduce(
    (sum, item) => sum + (item.interestUsd ?? item.earnedUsd - (item.rewardsEarnedUsd ?? 0)),
    0,
  )
  const yieldGeneratedPct = lendYieldGeneratedPct(interestEarnedUsd, investments)

  return {
    totalSuppliedUsd,
    netApyPct,
    interestEarnedUsd,
    yieldGeneratedPct,
    projectedEarnings1dUsd: projectLendPortfolioEarningsUsd(investments, LEND_PROJECTION_HORIZONS_DAYS.d1),
    projectedEarnings30dUsd: projectLendPortfolioEarningsUsd(investments, LEND_PROJECTION_HORIZONS_DAYS.d30),
    projectedEarnings90dUsd: projectLendPortfolioEarningsUsd(investments, LEND_PROJECTION_HORIZONS_DAYS.d90),
    projectedEarnings6mUsd: projectLendPortfolioEarningsUsd(investments, LEND_PROJECTION_HORIZONS_DAYS.m6),
  }
}

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
  const healthFactor =
    totalBorrowedUsd > 0 ? tabData.creditLines.liquidationThresholdUsd / totalBorrowedUsd : null

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
  const investments = data.investments ?? []
  const totalSuppliedUsd = investments.reduce((sum, item) => sum + item.suppliedUsd, 0)
  const netApyPct = lendNetApyPct(investments)
  // Split supply interest from protocol rewards on the tile. The read-model now
  // exposes each investment's interestUsd (unit interest × price) and rewardsEarnedUsd
  // separately, so the "Interest Earned" tile shows pure supply interest and the
  // "Rewards Earned" tile shows the reward component. When a position hasn't been
  // migrated to the split shape yet, fall back to the legacy conflated earnedUsd so
  // the tile still reconciles with the hero — that fallback disappears as positions
  // pick up the new fields.
  const interestEarnedUsd = investments.reduce(
    (sum, item) => sum + (item.interestUsd ?? item.earnedUsd - (item.rewardsEarnedUsd ?? 0)),
    0,
  )
  const rewardsEarnedUsd = investments.reduce((sum, item) => sum + (item.rewardsEarnedUsd ?? 0), 0)
  const claimableRewardsUsd = data.rewardsSummary?.claimableUsd ?? 0

  return {
    totalSuppliedUsd,
    netApyPct,
    interestEarnedUsd,
    rewardsEarnedUsd,
    claimableRewardsUsd,
  }
}

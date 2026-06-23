import { calculateCreditMetrics, formatFixed } from "@/app/lib/credit-engine"
import type { BorrowSystemState } from "@/app/lib/credit-engine"
import type { MultiplySystemState } from "@/app/lib/multiply-engine"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"

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

const WAD = 10n ** 18n
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

function wadToPct(value: bigint) {
  return (Number(value) / Number(WAD)) * 100
}

function usd6ToNumber(value: bigint) {
  return Number.parseFloat(formatFixed(value, 6))
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
  const weightedApr =
    collateralPositions.length > 0
      ? collateralPositions.reduce((sum, row) => sum + row.pairApr, 0) / collateralPositions.length
      : 0

  return {
    overview: {
      netValueUsd: totalCollateralUsd - totalBorrowedUsd,
      totalBorrowedUsd,
      liquidationBufferUsd: Math.max(0, snapshot.liquidationThresholdUsd - totalBorrowedUsd),
      riskPremiumPct: 0,
    },
    performance: {
      poolCollateralUsd: totalCollateralUsd,
      netApyPct: weightedApr,
      interestEarnedUsd,
      interestOwedUsd,
    },
  }
}

export function buildBorrowDashboardMetrics(state: BorrowSystemState, walletId: string): DashboardTabMetrics {
  const metrics = calculateCreditMetrics(state, walletId)

  return {
    overview: {
      netValueUsd: usd6ToNumber(metrics.netAccountValueUsd6),
      totalBorrowedUsd: usd6ToNumber(metrics.totalBorrowedUsd6),
      liquidationBufferUsd: usd6ToNumber(metrics.liquidationBufferUsd6 > 0n ? metrics.liquidationBufferUsd6 : 0n),
      riskPremiumPct: wadToPct(metrics.riskPremiumWad),
    },
    performance: {
      poolCollateralUsd: usd6ToNumber(metrics.poolCollateralValueUsd6),
      netApyPct: wadToPct(metrics.netApyWad),
      interestEarnedUsd: usd6ToNumber(metrics.interestEarnedUsd6),
      interestOwedUsd: usd6ToNumber(metrics.interestOwedUsd6),
    },
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
  const positions = Object.values(state.positions).filter((position) => position.walletId === walletId)
  const totalCollateralUsd = tabData.creditLines.totalCollateralUsd
  const totalBorrowedUsd = tabData.creditLines.totalBorrowedUsd
  const liquidationBufferUsd = Math.max(0, tabData.creditLines.liquidationThresholdUsd - totalBorrowedUsd)
  const netValueUsd = totalCollateralUsd - totalBorrowedUsd

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

  const netApyPct =
    positions.length === 0
      ? 0
      : weightedAverage(
          positions.map((position) => ({
            weight: position.collateralValueUsd,
            value: position.netApy * 100,
          })),
        )

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
      netValueUsd,
      totalBorrowedUsd,
      liquidationBufferUsd,
      riskPremiumPct,
    },
    performance: {
      poolCollateralUsd: totalCollateralUsd,
      netApyPct,
      interestEarnedUsd,
      interestOwedUsd,
    },
  }
}

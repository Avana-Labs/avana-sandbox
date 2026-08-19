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

const WAD = 10n ** 18n
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

function wadToPct(value: bigint) {
  return (Number(value) / Number(WAD)) * 100
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

export function buildBorrowDashboardMetrics(
  state: BorrowSystemState,
  walletId: string,
  now: number = Date.now(),
): DashboardTabMetrics {
  // Accrue debt/collateral indexes to `now` before reading the credit engine, so the
  // headline debt is the CURRENT-index total — the same canonical accrual the Borrow
  // tab already applies (buildPortfolioBorrowData -> accrueBorrowSystemState). Without
  // this the headline read the stored index frozen at the last action's `state.now`,
  // so it lagged the tab by the interest that had ticked since (the D3 $6.73 vs $6.80
  // gap). accrueBorrowSystemState is immutable and no-ops when now <= state.now.
  const accrued = accrueBorrowSystemState(state, now)
  const metrics = calculateCreditMetrics(accrued, walletId)

  // The engine's net account value excludes LP that has been returned to the wallet
  // after a collateral withdrawal. Count only the tracked returned LP bucket here:
  // the sandbox still pre-seeds pledgeable LP across the catalog, and that idle seed
  // balance should not inflate Net Value.
  const account = accrued.accounts[walletId]
  const returnedLpBalancesUsd6 = account
    ? Object.values(account.walletReturnedLpBalancesUsd6 ?? {}).reduce((sum, value) => sum + value, 0n)
    : 0n

  return {
    overview: {
      netValueUsd: usd6ToNumber(metrics.netAccountValueUsd6 + returnedLpBalancesUsd6),
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

  // Equity-weighted (canonical), via the shared helper the Multiply detail snapshot uses —
  // not the old collateral-weighted blend. netApy is a fraction, so ×100 for a percent.
  const netApyPct = multiplyNetApyFraction(positions) * 100

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

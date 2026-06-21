import {
  calculateHealthFactorWad,
  calculateSpokeCreditMetrics,
  currentDebtValueUsd6,
  debtInterestOwedUsd6,
  formatFixed,
  totalDebtValueUsd6,
  type BorrowSpokeId,
  type BorrowSystemState,
} from "@/app/lib/credit-engine"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { selectBorrowCollateralPools, selectInitialBorrowDebts, selectWalletBorrowSnapshot } from "@/app/lib/borrow-system/selectors"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function spokeHealthFactor(state: BorrowSystemState, walletId: string, marketId: string) {
  const spokeId = state.markets[marketId]?.spokeId
  if (!spokeId) return Number.POSITIVE_INFINITY
  const healthFactorWad = calculateHealthFactorWad(state, walletId, spokeId)
  return healthFactorWad != null ? fixedToNumber(healthFactorWad, 18) : Number.POSITIVE_INFINITY
}

export function selectPortfolioSupplyRows(state: BorrowSystemState, walletId: string): SupplyRowContext[] {
  const pools = selectBorrowCollateralPools(state, walletId)
  const debts = selectInitialBorrowDebts(state, walletId)

  return pools.map((pool) => ({
    pool,
    borrowedUsd: debts[pool.id] ?? 0,
    remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - (debts[pool.id] ?? 0)),
    liquidationThresholdUsd: pool.liquidationUsd,
    healthFactor: spokeHealthFactor(state, walletId, pool.id),
    pairApr: pool.pairApr,
    feesUsd: 0,
    feesLabel: "$0.00",
  }))
}

export function selectPortfolioDebtRows(state: BorrowSystemState, walletId: string): DebtRowContext[] {
  const account = state.accounts[walletId]
  if (!account) return []
  const poolById = new Map(selectBorrowCollateralPools(state, walletId).map((pool) => [pool.id, pool]))
  const rows: DebtRowContext[] = []

  for (const position of account.debtPositions) {
    const pool = position.marketId ? poolById.get(position.marketId) : null
    if (!pool) continue
    const borrowedUsd = fixedToNumber(currentDebtValueUsd6(position), 6)
    rows.push({
      id: position.id,
      pool,
      borrowedUsd,
      liquidationThresholdUsd: pool.liquidationUsd,
      healthFactor: spokeHealthFactor(state, walletId, pool.id),
      borrowApr: fixedToNumber(position.borrowRateWad, 18) * 100,
      accruedInterestUsd: fixedToNumber(debtInterestOwedUsd6(position), 6),
      dailyInterestUsd: (borrowedUsd * fixedToNumber(position.borrowRateWad, 18)) / 365,
    })
  }

  return rows
}

export function selectBorrowSnapshot(state: BorrowSystemState, walletId: string): BorrowSnapshot {
  const account = state.accounts[walletId]
  if (!account) {
    return {
      approvedUsd: 0,
      liquidationThresholdUsd: 0,
      totalBorrowedUsd: 0,
      totalCollateralUsd: 0,
      averageHealthFactor: null,
      currentLtvPct: 0,
      spokeBreakdown: [],
    }
  }

  const walletSnapshot = selectWalletBorrowSnapshot(state, walletId)
  const totalCollateralUsd = walletSnapshot.totalCollateralUsd
  const totalBorrowedUsd = fixedToNumber(totalDebtValueUsd6(account), 6)
  const ownedSpokes = Array.from(
    new Set(account.collateralPositions.map((position) => state.markets[position.marketId]?.spokeId).filter(Boolean)),
  ) as BorrowSpokeId[]
  const spokeBreakdown = ownedSpokes
    .map((spokeId) => {
      const metrics = calculateSpokeCreditMetrics(state, walletId, spokeId)
      const label =
        Object.values(state.markets).find((market) => market.spokeId === spokeId)?.display.venue ?? spokeId

      return {
        spokeId,
        label,
        availableCreditUsd: fixedToNumber(metrics.availableCreditUsd6, 6),
        totalBorrowedUsd: fixedToNumber(metrics.totalBorrowedUsd6, 6),
        liquidationBufferUsd: fixedToNumber(metrics.liquidationBufferUsd6 > 0n ? metrics.liquidationBufferUsd6 : 0n, 6),
        healthFactor: metrics.totalBorrowedUsd6 > 0n ? fixedToNumber(metrics.healthFactorWad, 18) : null,
      }
    })
    .sort((left, right) => right.totalBorrowedUsd - left.totalBorrowedUsd)

  return {
    approvedUsd: walletSnapshot.availableCreditUsd,
    liquidationThresholdUsd: walletSnapshot.liquidationValueUsd,
    totalBorrowedUsd,
    totalCollateralUsd,
    averageHealthFactor: walletSnapshot.healthFactor,
    currentLtvPct: totalCollateralUsd > 0 ? (totalBorrowedUsd / totalCollateralUsd) * 100 : 0,
    spokeBreakdown,
  }
}

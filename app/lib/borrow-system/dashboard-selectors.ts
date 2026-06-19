import { currentDebtValueUsd6, debtInterestOwedUsd6, formatFixed, totalDebtValueUsd6, type BorrowSystemState } from "@/app/lib/credit-engine"
import type { BorrowSnapshot } from "@/app/portfolio/borrow-hero-state"
import type { DebtRowContext } from "@/app/borrow/components/debts-table"
import type { SupplyRowContext } from "@/app/borrow/components/supplies-table"
import { selectBorrowCollateralPools, selectInitialBorrowDebts, selectWalletBorrowSnapshot } from "@/app/lib/borrow-system/selectors"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

export function selectPortfolioSupplyRows(state: BorrowSystemState, walletId: string): SupplyRowContext[] {
  const pools = selectBorrowCollateralPools(state, walletId)
  const debts = selectInitialBorrowDebts(state, walletId)

  return pools.map((pool) => ({
    pool,
    borrowedUsd: debts[pool.id] ?? 0,
    remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - (debts[pool.id] ?? 0)),
    liquidationThresholdUsd: pool.liquidationUsd,
    healthFactor: debts[pool.id] ? pool.liquidationUsd / debts[pool.id] : Number.POSITIVE_INFINITY,
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
      healthFactor: borrowedUsd > 0 ? pool.liquidationUsd / borrowedUsd : Number.POSITIVE_INFINITY,
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
    }
  }

  const walletSnapshot = selectWalletBorrowSnapshot(state, walletId)
  const totalCollateralUsd = walletSnapshot.totalCollateralUsd
  const totalBorrowedUsd = fixedToNumber(totalDebtValueUsd6(account), 6)

  return {
    approvedUsd: walletSnapshot.availableCreditUsd,
    liquidationThresholdUsd: walletSnapshot.liquidationValueUsd,
    totalBorrowedUsd,
    totalCollateralUsd,
    averageHealthFactor: walletSnapshot.healthFactor,
    currentLtvPct: totalCollateralUsd > 0 ? (totalBorrowedUsd / totalCollateralUsd) * 100 : 0,
  }
}

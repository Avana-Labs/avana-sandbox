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
import type { BorrowSnapshot } from "@/app/dashboard/borrow-hero-state"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import {
  selectAllAvailableCollateralPools,
  selectBorrowCollateralPools,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"

function fixedToNumber(value: bigint, decimals: number) {
  return Number.parseFloat(formatFixed(value, decimals))
}

function spokeHealthFactor(state: BorrowSystemState, walletId: string, marketId: string) {
  const spokeId = state.markets[marketId]?.spokeId
  if (!spokeId) return Number.POSITIVE_INFINITY
  const healthFactorWad = calculateHealthFactorWad(state, walletId, spokeId)
  return healthFactorWad != null ? fixedToNumber(healthFactorWad, 18) : Number.POSITIVE_INFINITY
}

function spokeAvailableCreditUsd(state: BorrowSystemState, walletId: string, marketId: string) {
  const spokeId = state.markets[marketId]?.spokeId
  if (!spokeId) return 0
  const metrics = calculateSpokeCreditMetrics(state, walletId, spokeId)
  return fixedToNumber(metrics.availableCreditUsd6, 6)
}

export function selectPortfolioSupplyRows(state: BorrowSystemState, walletId: string): SupplyRowContext[] {
  const pools = selectBorrowCollateralPools(state, walletId)
  const debts = selectInitialBorrowDebts(state, walletId)

  return pools.map((pool) => ({
    pool,
    borrowedUsd: debts[pool.id] ?? 0,
    remainingBorrowPowerUsd: spokeAvailableCreditUsd(state, walletId, pool.id),
    liquidationThresholdUsd: pool.liquidationUsd,
    healthFactor: spokeHealthFactor(state, walletId, pool.id),
    pairApr: pool.pairApr,
    feesUsd: 0,
    feesLabel: "$0.00",
  }))
}

// Health factor for a debt row. Uses the debt position's OWN spoke — which
// provably contains this debt — rather than a matched collateral pool's spoke.
// Falls back to the wallet-wide health factor if the debt has no resolvable
// spoke, so a debt row can never falsely read ∞ ("safe") while the wallet owes.
function debtHealthFactor(
  state: BorrowSystemState,
  walletId: string,
  position: BorrowSystemState["accounts"][string]["debtPositions"][number],
  walletHealthFactor: number | null,
): number | null {
  const spokeId = position.spokeId ?? (position.marketId ? state.markets[position.marketId]?.spokeId : undefined)
  if (spokeId) {
    const healthFactorWad = calculateHealthFactorWad(state, walletId, spokeId)
    if (healthFactorWad != null) return fixedToNumber(healthFactorWad, 18)
  }
  return walletHealthFactor
}

export function selectPortfolioDebtRows(state: BorrowSystemState, walletId: string): DebtRowContext[] {
  const account = state.accounts[walletId]
  if (!account) return []
  // Resolve against the FULL market catalog, not just pledged pools. A debt can
  // exist against a market the wallet has not pledged collateral in (borrowed
  // against spoke-shared collateral); keying on pledged pools only would silently
  // drop that debt from the table while "Total Borrowed" still counts it.
  const poolById = new Map(selectAllAvailableCollateralPools(state, walletId).map((pool) => [pool.id, pool]))
  const walletHealthFactor = selectWalletBorrowSnapshot(state, walletId).healthFactor
  const rows: DebtRowContext[] = []

  for (const position of account.debtPositions) {
    if (currentDebtValueUsd6(position) <= 0n) continue
    const pool = position.marketId ? poolById.get(position.marketId) : undefined
    if (!pool) continue
    const borrowedUsd = fixedToNumber(currentDebtValueUsd6(position), 6)
    // Single-source the borrow APR to the current market rate (base + risk premium),
    // matching the action page and borrow list, instead of the stored position rate.
    const asset = state.assets[position.assetId]
    const borrowRateWad =
      asset != null
        ? asset.borrowConfig.baseBorrowAprWad +
          calculateSpokeCreditMetrics(state, walletId, position.spokeId).riskPremiumWad
        : position.borrowRateWad
    rows.push({
      id: position.id,
      pool,
      debtAssetSymbol: asset?.symbol ?? "",
      borrowedUsd,
      liquidationThresholdUsd: pool.liquidationUsd,
      healthFactor: debtHealthFactor(state, walletId, position, walletHealthFactor),
      borrowApr: fixedToNumber(borrowRateWad, 18) * 100,
      accruedInterestUsd: fixedToNumber(debtInterestOwedUsd6(position), 6),
      dailyInterestUsd: (borrowedUsd * fixedToNumber(borrowRateWad, 18)) / 365,
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
      const label = Object.values(state.markets).find((market) => market.spokeId === spokeId)?.display.venue ?? spokeId

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

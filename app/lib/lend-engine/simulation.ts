import {
  accrueLiquidityIndex,
  calculateAvailableLiquidity,
  calculateCurrentSuppliedBalance,
  calculateElapsedYears,
  calculateInterestEarned,
  calculateMaxWithdrawable,
  calculateScaledDepositAmount,
  calculateSuppliedValueUsd,
  calculateTotalApy,
  calculateUtilization,
  calculateWithdrawSplit,
  resolveLiquidityIndex,
} from "./formulas"
import type { LendDepositSimulation, LendMarket, LendPosition, LendWithdrawSimulation } from "./types"
import { validateDepositAction, validateWithdrawAction } from "./validation"

const PRICE_STALE_MS = 86_400_000

function isPriceStale(market: LendMarket, now: number) {
  return now - market.priceUpdatedAt > PRICE_STALE_MS
}

function accrueMarket(market: LendMarket, now: number): LendMarket {
  const elapsedYears = calculateElapsedYears(now, market.lastAccrualTimestamp)
  const liquidityIndex = accrueLiquidityIndex({
    oldLiquidityIndex: market.liquidityIndex,
    supplyApy: market.totalApy,
    elapsedYears,
  })
  return {
    ...market,
    liquidityIndex,
    lastAccrualTimestamp: now,
  }
}

function accruePosition(position: LendPosition, market: LendMarket): LendPosition {
  const currentSuppliedAmount = calculateCurrentSuppliedBalance(position.scaledBalance, market.liquidityIndex)
  const interestEarned = calculateInterestEarned(currentSuppliedAmount, position.principalAmount)
  return {
    ...position,
    liquidityIndexAtLastAction: market.liquidityIndex,
    currentSuppliedAmount,
    interestEarned,
    suppliedValueUsd: calculateSuppliedValueUsd(currentSuppliedAmount, market.assetPriceUsd),
    updatedAt: market.lastAccrualTimestamp,
  }
}

function emptyPositionMetrics(liquidityIndex: number): LendPositionMetricsShape {
  return {
    suppliedAmount: 0,
    suppliedValueUsd: 0,
    principalAmount: 0,
    interestEarned: 0,
    scaledBalance: 0,
    liquidityIndex,
  }
}

type LendPositionMetricsShape = LendDepositSimulation["before"]

function toPositionMetrics(position: LendPosition | undefined, market: LendMarket): LendPositionMetricsShape {
  if (!position || position.status !== "active") {
    return emptyPositionMetrics(market.liquidityIndex)
  }
  return {
    suppliedAmount: position.currentSuppliedAmount,
    suppliedValueUsd: position.suppliedValueUsd,
    principalAmount: position.principalAmount,
    interestEarned: position.interestEarned,
    scaledBalance: position.scaledBalance,
    liquidityIndex: market.liquidityIndex,
  }
}

export function simulateDeposit(params: {
  market: LendMarket
  position?: LendPosition
  depositAmount: number
  walletBalance?: number
  now?: number
}): LendDepositSimulation {
  const now = params.now ?? Date.now()
  const market = accrueMarket(params.market, now)
  const position = params.position ? accruePosition(params.position, market) : undefined
  const before = toPositionMetrics(position, market)
  const liquidityIndex = resolveLiquidityIndex(market.liquidityIndex)
  const scaledDepositAmount = calculateScaledDepositAmount(params.depositAmount, liquidityIndex)
  const afterScaledBalance = before.scaledBalance + scaledDepositAmount
  const afterSuppliedAmount = calculateCurrentSuppliedBalance(afterScaledBalance, liquidityIndex)
  const afterPrincipal = before.principalAmount + params.depositAmount
  const afterInterest = calculateInterestEarned(afterSuppliedAmount, afterPrincipal)

  const marketBefore = {
    totalSupplied: market.totalSupplied,
    availableLiquidity: market.availableLiquidity,
    utilization: market.utilization,
  }
  const marketAfterTotalSupplied = market.totalSupplied + params.depositAmount
  const marketAfterAvailable = calculateAvailableLiquidity(marketAfterTotalSupplied, market.totalBorrowed)
  const marketAfter = {
    totalSupplied: marketAfterTotalSupplied,
    availableLiquidity: marketAfterAvailable,
    utilization: calculateUtilization(market.totalBorrowed, marketAfterTotalSupplied),
  }

  const validation = validateDepositAction({
    depositAmount: params.depositAmount,
    walletBalance: params.walletBalance,
    market,
    assetSupported: true,
    priceStale: isPriceStale(market, now),
  })

  return {
    action: "deposit",
    input: {
      marketId: market.marketId,
      assetSymbol: market.asset.symbol,
      depositAmount: params.depositAmount,
    },
    before,
    after: {
      suppliedAmount: afterSuppliedAmount,
      suppliedValueUsd: calculateSuppliedValueUsd(afterSuppliedAmount, market.assetPriceUsd),
      principalAmount: afterPrincipal,
      interestEarned: afterInterest,
      scaledBalance: afterScaledBalance,
      liquidityIndex,
    },
    market: {
      supplyApy: market.supplyApy,
      rewardsApy: market.rewardsApy,
      totalApy: calculateTotalApy(market.supplyApy, market.rewardsApy),
      utilization: market.utilization,
      availableLiquidity: market.availableLiquidity,
      totalSupplied: market.totalSupplied,
      supplyCap: market.supplyCap,
    },
    marketBefore,
    marketAfter,
    validation,
  }
}

export function simulateWithdraw(params: {
  market: LendMarket
  position: LendPosition
  withdrawAmount: number
  now?: number
}): LendWithdrawSimulation {
  const now = params.now ?? Date.now()
  const market = accrueMarket(params.market, now)
  const position = accruePosition(params.position, market)
  const before = toPositionMetrics(position, market)
  const liquidityIndex = resolveLiquidityIndex(market.liquidityIndex)
  const maxWithdrawable = calculateMaxWithdrawable(before.suppliedAmount, market.availableLiquidity)
  const split = calculateWithdrawSplit({
    withdrawAmount: params.withdrawAmount,
    currentBalance: before.suppliedAmount,
    principalDeposited: before.principalAmount,
  })
  const scaledWithdrawAmount = calculateScaledDepositAmount(params.withdrawAmount, liquidityIndex)
  const afterScaledBalance = Math.max(0, before.scaledBalance - scaledWithdrawAmount)
  const afterSuppliedAmount = calculateCurrentSuppliedBalance(afterScaledBalance, liquidityIndex)
  const afterPrincipal = split.remainingPrincipal
  const afterInterest = calculateInterestEarned(afterSuppliedAmount, afterPrincipal)

  const marketBefore = {
    totalSupplied: market.totalSupplied,
    availableLiquidity: market.availableLiquidity,
    utilization: market.utilization,
  }
  const marketAfterTotalSupplied = Math.max(0, market.totalSupplied - params.withdrawAmount)
  const marketAfterAvailable = calculateAvailableLiquidity(marketAfterTotalSupplied, market.totalBorrowed)
  const marketAfter = {
    totalSupplied: marketAfterTotalSupplied,
    availableLiquidity: marketAfterAvailable,
    utilization: calculateUtilization(market.totalBorrowed, marketAfterTotalSupplied),
  }

  const validation = validateWithdrawAction({
    withdrawAmount: params.withdrawAmount,
    market,
    position,
    currentSuppliedBalance: before.suppliedAmount,
    maxWithdrawable,
    priceStale: isPriceStale(market, now),
  })

  return {
    action: "withdraw",
    input: {
      marketId: market.marketId,
      assetSymbol: market.asset.symbol,
      withdrawAmount: params.withdrawAmount,
    },
    before,
    after: {
      suppliedAmount: afterSuppliedAmount,
      suppliedValueUsd: calculateSuppliedValueUsd(afterSuppliedAmount, market.assetPriceUsd),
      principalAmount: afterPrincipal,
      interestEarned: afterInterest,
      scaledBalance: afterScaledBalance,
      liquidityIndex,
    },
    withdrawal: {
      withdrawAmount: params.withdrawAmount,
      withdrawValueUsd: calculateSuppliedValueUsd(params.withdrawAmount, market.assetPriceUsd),
      principalWithdrawn: split.principalWithdrawn,
      interestWithdrawn: split.interestWithdrawn,
      maxWithdrawable,
    },
    market: {
      supplyApy: market.supplyApy,
      rewardsApy: market.rewardsApy,
      totalApy: calculateTotalApy(market.supplyApy, market.rewardsApy),
      utilization: market.utilization,
      availableLiquidity: market.availableLiquidity,
      totalSupplied: market.totalSupplied,
    },
    marketBefore,
    marketAfter,
    validation,
  }
}

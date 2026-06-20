import { calculateAvailableLiquidity, calculateCurrentSuppliedBalance, calculateInterestEarned, calculateSuppliedValueUsd, calculateUtilization } from "./formulas"
import { simulateDeposit, simulateWithdraw } from "./simulation"
import type { LendAction, LendClaimRewardsIntent, LendDepositIntent, LendPosition, LendSystemState, LendWithdrawIntent } from "./types"

function findWalletPosition(state: LendSystemState, walletId: string, marketId: string): LendPosition | undefined {
  return Object.values(state.positions).find(
    (position) => position.walletId === walletId && position.marketId === marketId && position.status === "active",
  )
}

function updateMarketTotals(market: LendSystemState["markets"][string], deltaSupplied: number) {
  const totalSupplied = Math.max(0, market.totalSupplied + deltaSupplied)
  const availableLiquidity = calculateAvailableLiquidity(totalSupplied, market.totalBorrowed)
  return {
    ...market,
    totalSupplied,
    availableLiquidity,
    utilization: calculateUtilization(market.totalBorrowed, totalSupplied),
  }
}

export function applyLendAction(state: LendSystemState, action: LendAction, ids: { positionId: string; transactionId: string }): LendSystemState {
  const now = action.at ?? state.now
  if (action.type === "deposit") {
    return applyDeposit(state, action, now, ids)
  }
  if (action.type === "claim") {
    return applyClaimRewards(state, action, now, ids)
  }
  return applyWithdraw(state, action, now, ids)
}

function applyDeposit(
  state: LendSystemState,
  action: LendDepositIntent,
  now: number,
  ids: { positionId: string; transactionId: string },
): LendSystemState {
  const market = state.markets[action.marketId]
  if (!market) return state
  const existing = findWalletPosition(state, action.walletId, action.marketId)
  const simulation = simulateDeposit({
    market,
    position: existing,
    depositAmount: action.depositAmount,
    walletBalance: action.walletBalance,
    now,
  })
  if (!simulation.validation.allowed) return state

  const updatedMarket = updateMarketTotals(
    {
      ...market,
      liquidityIndex: simulation.after.liquidityIndex,
      lastAccrualTimestamp: now,
    },
    action.depositAmount,
  )

  const positionId = existing?.positionId ?? ids.positionId
  const position: LendPosition = {
    positionId,
    walletId: action.walletId,
    marketId: action.marketId,
    asset: market.asset.symbol,
    principalAmount: simulation.after.principalAmount,
    scaledBalance: simulation.after.scaledBalance,
    liquidityIndexAtLastAction: simulation.after.liquidityIndex,
    currentSuppliedAmount: simulation.after.suppliedAmount,
    interestEarned: simulation.after.interestEarned,
    rewardsEarnedUsd: simulation.after.rewardsEarnedUsd,
    suppliedValueUsd: simulation.after.suppliedValueUsd,
    openedAt: existing?.openedAt ?? now,
    updatedAt: now,
    status: simulation.after.suppliedAmount > 0 ? "active" : "closed",
  }

  return {
    now,
    markets: { ...state.markets, [action.marketId]: updatedMarket },
    positions: { ...state.positions, [positionId]: position },
    transactions: [
      ...state.transactions,
      {
        id: ids.transactionId,
        walletId: action.walletId,
        marketId: action.marketId,
        kind: "deposit",
        asset: market.asset.symbol,
        amount: action.depositAmount,
        at: now,
      },
    ],
  }
}

function applyWithdraw(
  state: LendSystemState,
  action: LendWithdrawIntent,
  now: number,
  ids: { positionId: string; transactionId: string },
): LendSystemState {
  const market = state.markets[action.marketId]
  const position = state.positions[action.positionId]
  if (!market || !position) return state

  const simulation = simulateWithdraw({
    market,
    position,
    withdrawAmount: action.withdrawAmount,
    now,
  })
  if (!simulation.validation.allowed) return state

  const updatedMarket = updateMarketTotals(
    {
      ...market,
      liquidityIndex: simulation.after.liquidityIndex,
      lastAccrualTimestamp: now,
    },
    -action.withdrawAmount,
  )

  const updatedPosition: LendPosition = {
    ...position,
    principalAmount: simulation.after.principalAmount,
    scaledBalance: simulation.after.scaledBalance,
    liquidityIndexAtLastAction: simulation.after.liquidityIndex,
    currentSuppliedAmount: simulation.after.suppliedAmount,
    interestEarned: simulation.after.interestEarned,
    rewardsEarnedUsd: simulation.after.rewardsEarnedUsd,
    suppliedValueUsd: simulation.after.suppliedValueUsd,
    updatedAt: now,
    status: simulation.after.suppliedAmount <= 1e-12 ? "closed" : "active",
  }

  return {
    now,
    markets: { ...state.markets, [action.marketId]: updatedMarket },
    positions: { ...state.positions, [action.positionId]: updatedPosition },
    transactions: [
      ...state.transactions,
      {
        id: ids.transactionId,
        walletId: action.walletId,
        marketId: action.marketId,
        kind: "withdraw",
        asset: market.asset.symbol,
        amount: action.withdrawAmount,
        at: now,
      },
    ],
  }
}

function applyClaimRewards(
  state: LendSystemState,
  action: LendClaimRewardsIntent,
  now: number,
  ids: { positionId: string; transactionId: string },
): LendSystemState {
  const walletPositions = Object.entries(state.positions).filter(([, position]) => position.walletId === action.walletId)
  const claimableUsd = walletPositions.reduce((sum, [, position]) => sum + position.rewardsEarnedUsd, 0)
  if (claimableUsd <= 0) return state

  const nextPositions = Object.fromEntries(
    Object.entries(state.positions).map(([positionId, position]) => {
      if (position.walletId !== action.walletId) return [positionId, position]
      return [
        positionId,
        {
          ...position,
          rewardsEarnedUsd: 0,
          updatedAt: now,
        },
      ]
    }),
  )

  return {
    ...state,
    now,
    positions: nextPositions,
    transactions: [
      ...state.transactions,
      {
        id: ids.transactionId,
        walletId: action.walletId,
        marketId: "rewards",
        kind: "claim",
        asset: "Rewards",
        amount: claimableUsd,
        at: now,
      },
    ],
  }
}

export function refreshPositionMetrics(position: LendPosition, market: LendSystemState["markets"][string]): LendPosition {
  const currentSuppliedAmount = calculateCurrentSuppliedBalance(position.scaledBalance, market.liquidityIndex)
  return {
    ...position,
    currentSuppliedAmount,
    interestEarned: calculateInterestEarned(currentSuppliedAmount, position.principalAmount),
    suppliedValueUsd: calculateSuppliedValueUsd(currentSuppliedAmount, market.assetPriceUsd),
  }
}

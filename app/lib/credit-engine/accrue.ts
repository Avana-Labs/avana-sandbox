import type { BorrowSystemState } from "./types"
import { accrueLinearIndex } from "./units"

export function accrueBorrowSystemState(state: BorrowSystemState, nextNow: number): BorrowSystemState {
  if (nextNow <= state.now) return state

  const elapsedSeconds = BigInt(Math.floor((nextNow - state.now) / 1000))
  if (elapsedSeconds <= 0n) return state

  const markets = Object.fromEntries(
    Object.entries(state.markets).map(([marketId, market]) => [
      marketId,
      {
        ...market,
        snapshot: {
          ...market.snapshot,
          supplyIndexRay: accrueLinearIndex(market.snapshot.supplyIndexRay, market.snapshot.feeApyWad, elapsedSeconds),
        },
      },
    ]),
  )

  const accounts = Object.fromEntries(
    Object.entries(state.accounts).map(([walletId, account]) => [
      walletId,
      {
        ...account,
        lastUpdatedAt: nextNow,
        debtPositions: account.debtPositions.map((position) => ({
          ...position,
          debtIndexRay: accrueLinearIndex(position.debtIndexRay, position.borrowRateWad, elapsedSeconds),
        })),
      },
    ]),
  )

  return {
    ...state,
    now: nextNow,
    markets,
    accounts,
  }
}

export function accrueBorrowSystemStateForWallet(state: BorrowSystemState, walletId: string, nextNow: number): BorrowSystemState {
  if (nextNow <= state.now) return state

  const elapsedSeconds = BigInt(Math.floor((nextNow - state.now) / 1000))
  if (elapsedSeconds <= 0n) return state

  const account = state.accounts[walletId]
  if (!account) return accrueBorrowSystemState(state, nextNow)

  const affectedMarketIds = new Set([
    ...account.collateralPositions.map((position) => position.marketId),
    ...account.debtPositions.map((position) => position.marketId).filter(Boolean) as string[],
  ])

  const markets = Object.fromEntries(
    Object.entries(state.markets).map(([marketId, market]) => {
      if (!affectedMarketIds.has(marketId)) {
        return [marketId, market]
      }
      return [
        marketId,
        {
          ...market,
          snapshot: {
            ...market.snapshot,
            supplyIndexRay: accrueLinearIndex(market.snapshot.supplyIndexRay, market.snapshot.feeApyWad, elapsedSeconds),
          },
        },
      ]
    }),
  )

  return {
    ...state,
    now: nextNow,
    markets,
    accounts: {
      ...state.accounts,
      [walletId]: {
        ...account,
        lastUpdatedAt: nextNow,
        debtPositions: account.debtPositions.map((position) => ({
          ...position,
          debtIndexRay: accrueLinearIndex(position.debtIndexRay, position.borrowRateWad, elapsedSeconds),
        })),
      },
    },
  }
}

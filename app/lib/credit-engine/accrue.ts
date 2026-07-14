import type { BorrowSystemState } from "./types"
import { accrueLinearIndex } from "./units"

export function accrueBorrowSystemState(state: BorrowSystemState, nextNow: number): BorrowSystemState {
  if (nextNow <= state.now) return state

  const elapsedSeconds = BigInt(Math.floor((nextNow - state.now) / 1000))
  if (elapsedSeconds <= 0n) return state

  const markets: BorrowSystemState["markets"] = {}
  for (const [marketId, market] of Object.entries(state.markets)) {
    markets[marketId] = {
      ...market,
      snapshot: {
        ...market.snapshot,
        supplyIndexRay: accrueLinearIndex(market.snapshot.supplyIndexRay, market.snapshot.feeApyWad, elapsedSeconds),
      },
    }
  }

  const accounts: BorrowSystemState["accounts"] = {}
  for (const [walletId, account] of Object.entries(state.accounts)) {
    accounts[walletId] = {
      ...account,
      lastUpdatedAt: nextNow,
      debtPositions: account.debtPositions.map((position) => ({
        ...position,
        debtIndexRay: accrueLinearIndex(position.debtIndexRay, position.borrowRateWad, elapsedSeconds),
      })),
    }
  }

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

  const affectedMarketIds = new Set<string>()
  for (const position of account.collateralPositions) {
    affectedMarketIds.add(position.marketId)
  }
  for (const position of account.debtPositions) {
    if (position.marketId) affectedMarketIds.add(position.marketId)
  }

  const markets: BorrowSystemState["markets"] = {}
  for (const [marketId, market] of Object.entries(state.markets)) {
    if (!affectedMarketIds.has(marketId)) {
      markets[marketId] = market
      continue
    }
    markets[marketId] = {
      ...market,
      snapshot: {
        ...market.snapshot,
        supplyIndexRay: accrueLinearIndex(market.snapshot.supplyIndexRay, market.snapshot.feeApyWad, elapsedSeconds),
      },
    }
  }

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

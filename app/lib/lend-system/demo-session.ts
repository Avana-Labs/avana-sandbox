import { buildDefaultLendSessionSeed } from "./storage"
import { serializeLendSystemState } from "./codec"
import { buildMockLendSystemState } from "./mock"

export function buildLendSessionSeed(walletId: string) {
  return buildDefaultLendSessionSeed(walletId)
}

export function buildConvexLendSessionSeed(walletId: string) {
  const state = buildMockLendSystemState(walletId)
  // Sandbox wallets hold practice funds in EVERY lend asset so any market can be
  // deposited into — no "you don't have X in your wallet" dead-ends. ~$1M of practice
  // funds per asset (it's play money). This is wallet holdings only; it isn't summed
  // into the portfolio total, so the $1M starter allocation is unchanged. Deposited
  // positions are still hydrated from Convex.
  const walletBalances: Record<string, Record<string, number>> = {
    [walletId]: {},
  }
  for (const market of Object.values(state.markets)) {
    walletBalances[walletId][market.marketId] = market.assetPriceUsd > 0 ? 1_000_000 / market.assetPriceUsd : 1_000_000
  }
  return serializeLendSystemState({
    ...state,
    walletBalances,
    positions: {},
    transactions: [],
  })
}

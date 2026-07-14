import { getDefaultWalletProfileId } from "@/app/lib/data/wallet/profiles"
import { serializeBorrowSystemState } from "./codec"
import { buildMockBorrowSystemState, rewardPositionsFromHomeClaims } from "./mock"

export function getBorrowSessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildBorrowSessionSeed(walletId = getBorrowSessionWalletId()) {
  return serializeBorrowSystemState(buildMockBorrowSystemState(walletId))
}

// Practice LP granted per market on a sandbox wallet so collateral can be pledged on
// ANY pool the user opens — it's play money, so there's no "go acquire LP" dead-end.
const SANDBOX_PLEDGEABLE_LP_USD6 = 1_000_000_000_000n // $1,000,000 per pool

export function buildConvexBorrowSessionSeed(walletId: string) {
  const state = buildMockBorrowSystemState(walletId)
  const walletLpBalancesUsd6: Record<string, bigint> = {}
  for (const marketId of Object.keys(state.markets)) {
    walletLpBalancesUsd6[marketId] = SANDBOX_PLEDGEABLE_LP_USD6
  }
  return serializeBorrowSystemState({
    ...state,
    accounts: {
      [walletId]: {
        walletId,
        walletBalanceUsd6: 0n,
        // Every market starts pledgeable; positions themselves are hydrated from Convex.
        walletLpBalancesUsd6,
        interestSettledUsd6: 0n,
        lastUpdatedAt: state.now,
        collateralPositions: [],
        debtPositions: [],
        // Seed the LP-fee reward positions so the Convex path shows a claim list; a
        // wallet's prior claims are applied on top during hydration (reduced claimable).
        rewardPositions: rewardPositionsFromHomeClaims(walletId, state.markets),
      },
    },
    transactions: [],
  })
}

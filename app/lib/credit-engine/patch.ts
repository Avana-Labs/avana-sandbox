import type { BorrowSystemState } from "./types"

export type BorrowStatePatch = {
  now?: number
  accounts?: BorrowSystemState["accounts"]
  markets?: BorrowSystemState["markets"]
  assets?: BorrowSystemState["assets"]
  transactions?: BorrowSystemState["transactions"]
}

export function createBorrowStatePatch(before: BorrowSystemState, after: BorrowSystemState): BorrowStatePatch {
  const patch: BorrowStatePatch = {}

  if (before.now !== after.now) {
    patch.now = after.now
  }

  if (before.accounts !== after.accounts) {
    patch.accounts = after.accounts
  }

  if (before.markets !== after.markets) {
    patch.markets = after.markets
  }

  if (before.assets !== after.assets) {
    patch.assets = after.assets
  }

  if (before.transactions !== after.transactions) {
    patch.transactions = after.transactions
  }

  return patch
}

export function applyBorrowStatePatch(state: BorrowSystemState, patch: BorrowStatePatch): BorrowSystemState {
  return {
    ...state,
    ...patch,
  }
}

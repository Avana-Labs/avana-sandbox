import { applyBorrowAction } from "./actions"
import type { BorrowAction, BorrowSystemState } from "./types"

export function evaluateBorrowAction(
  state: BorrowSystemState,
  action: BorrowAction,
  _mode: "dry-run" | "commit" = "commit",
): BorrowSystemState {
  return applyBorrowAction(state, action)
}

import type { BorrowAction, BorrowSystemState } from "@/app/lib/credit-engine"
import type { SandboxActionResult, TransactionIntent, TransactionPreview } from "./contracts"

/** Session surface used by Avana action flows (sandbox today, on-chain adapters later). */
export type BorrowActionSession = {
  state: BorrowSystemState
  createIntent: (action: BorrowAction) => TransactionIntent
  previewTransaction: (intent: TransactionIntent) => Promise<TransactionPreview>
  executeTransaction: (intent: TransactionIntent) => Promise<SandboxActionResult>
  isPending: boolean
}

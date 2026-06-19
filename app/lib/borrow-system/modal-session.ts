import type { BorrowAction, BorrowSystemState } from "@/app/lib/credit-engine"
import type { SandboxActionResult, TransactionIntent, TransactionPreview } from "./contracts"

export type BorrowModalSession = {
  state: BorrowSystemState
  createIntent: (action: BorrowAction) => TransactionIntent
  previewTransaction: (intent: TransactionIntent) => Promise<TransactionPreview>
  executeTransaction: (intent: TransactionIntent) => Promise<SandboxActionResult>
  isPending: boolean
}

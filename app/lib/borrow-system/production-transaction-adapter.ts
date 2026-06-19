import type { SandboxActionResult, TransactionAdapter, TransactionIntent, TransactionPreview } from "./contracts"

const NOT_IMPLEMENTED = "Production transaction adapter is not implemented"

export class ProductionTransactionAdapter implements TransactionAdapter {
  readonly mode = "production" as const

  async previewTransaction(_intent: TransactionIntent): Promise<TransactionPreview> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async executeTransaction(_intent: TransactionIntent): Promise<SandboxActionResult> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

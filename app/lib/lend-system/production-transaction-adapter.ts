import type { LendAction } from "@/app/lib/lend-engine"
import type {
  LendSandboxActionResult,
  LendTransactionAdapter,
  LendTransactionIntent,
  LendTransactionPreview,
} from "./contracts"

const NOT_IMPLEMENTED = "Production lend transaction adapter is not implemented"

export class ProductionLendTransactionAdapter implements LendTransactionAdapter {
  readonly mode = "production" as const

  createIntent(_action: LendAction): LendTransactionIntent {
    throw new Error(NOT_IMPLEMENTED)
  }

  async previewTransaction(_intent: LendTransactionIntent): Promise<LendTransactionPreview> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async executeTransaction(_intent: LendTransactionIntent): Promise<LendSandboxActionResult> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

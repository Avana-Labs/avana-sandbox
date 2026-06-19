import type { MultiplyAction } from "@/app/lib/multiply-engine"
import type {
  MultiplySandboxActionResult,
  MultiplyTransactionAdapter,
  MultiplyTransactionIntent,
  MultiplyTransactionPreview,
} from "./contracts"

const NOT_IMPLEMENTED = "Production multiply transaction adapter is not implemented"

export class ProductionMultiplyTransactionAdapter implements MultiplyTransactionAdapter {
  readonly mode = "production" as const

  createIntent(_action: MultiplyAction): MultiplyTransactionIntent {
    throw new Error(NOT_IMPLEMENTED)
  }

  async previewTransaction(_intent: MultiplyTransactionIntent): Promise<MultiplyTransactionPreview> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async executeTransaction(_intent: MultiplyTransactionIntent): Promise<MultiplySandboxActionResult> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

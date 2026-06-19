import type { MultiplyTransactionAdapter } from "./contracts"

const NOT_IMPLEMENTED = "Production multiply transaction adapter is not implemented"

export class ProductionMultiplyTransactionAdapter implements MultiplyTransactionAdapter {
  readonly mode = "production" as const

  createIntent() {
    throw new Error(NOT_IMPLEMENTED)
  }

  async previewTransaction() {
    throw new Error(NOT_IMPLEMENTED)
  }

  async executeTransaction() {
    throw new Error(NOT_IMPLEMENTED)
  }
}

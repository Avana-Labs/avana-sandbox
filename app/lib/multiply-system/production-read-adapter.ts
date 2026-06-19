import type { MultiplyReadAdapter } from "./contracts"

const NOT_IMPLEMENTED = "Production multiply read adapter is not implemented"

export class ProductionMultiplyReadAdapter implements MultiplyReadAdapter {
  readonly mode = "production" as const

  async readWalletSnapshot(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMarkets() {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMultiplyPage(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPortfolioMultiply(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }
}

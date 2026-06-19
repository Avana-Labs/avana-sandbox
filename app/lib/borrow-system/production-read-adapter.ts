import type { ProductionReadAdapter } from "./contracts"

const NOT_IMPLEMENTED = "Production read adapter is not implemented"

export class ProductionBorrowReadAdapter implements ProductionReadAdapter {
  readonly mode = "production" as const

  async readWalletSnapshot(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMarkets() {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readBorrowPage(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPortfolioBorrow(_walletId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPoolDetail(_poolId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readAssetDetail(_assetId: string) {
    throw new Error(NOT_IMPLEMENTED)
  }
}

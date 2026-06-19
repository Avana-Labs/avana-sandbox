import type { AssetDetail, PoolDetail } from "@/app/lib/borrow-detail"
import type { BorrowPageData } from "@/app/lib/data/providers/borrow"
import type { PortfolioBorrowTabData } from "@/app/lib/data/providers/portfolio"
import type { BorrowMarketRecord } from "@/app/lib/credit-engine"
import type { ProductionReadAdapter, WalletReadSnapshot } from "./contracts"

const NOT_IMPLEMENTED = "Production read adapter is not implemented"

export class ProductionBorrowReadAdapter implements ProductionReadAdapter {
  readonly mode = "production" as const

  async readWalletSnapshot(_walletId: string): Promise<WalletReadSnapshot> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMarkets(): Promise<BorrowMarketRecord[]> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readBorrowPage(_walletId: string): Promise<BorrowPageData> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPortfolioBorrow(_walletId: string): Promise<PortfolioBorrowTabData> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPoolDetail(_poolId: string): Promise<PoolDetail | null> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readAssetDetail(_assetId: string): Promise<AssetDetail | null> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

import type { MultiplyMarketRecord } from "@/app/lib/multiply-engine"
import type { MultiplyPageData } from "@/app/lib/data/providers/multiply"
import type { PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import type { MultiplyReadAdapter, MultiplyWalletReadSnapshot } from "./contracts"

const NOT_IMPLEMENTED = "Production multiply read adapter is not implemented"

export class ProductionMultiplyReadAdapter implements MultiplyReadAdapter {
  readonly mode = "production" as const

  async readWalletSnapshot(_walletId: string): Promise<MultiplyWalletReadSnapshot> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMarkets(): Promise<MultiplyMarketRecord[]> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMultiplyPage(_walletId: string): Promise<MultiplyPageData> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPortfolioMultiply(_walletId: string): Promise<PortfolioMultiplyTabData> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

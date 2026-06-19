import type { LendMarket } from "@/app/lib/lend-engine"
import type { LendPageData } from "@/app/lib/data/providers/lend/types"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio/types"
import type { LendReadAdapter, LendWalletReadSnapshot } from "./contracts"

const NOT_IMPLEMENTED = "Production lend read adapter is not implemented"

export class ProductionLendReadAdapter implements LendReadAdapter {
  readonly mode = "production" as const

  async readWalletSnapshot(_walletId: string): Promise<LendWalletReadSnapshot> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readMarkets(): Promise<LendMarket[]> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readLendPage(_walletId: string): Promise<LendPageData> {
    throw new Error(NOT_IMPLEMENTED)
  }

  async readPortfolioLend(_walletId: string): Promise<PortfolioLendTabData> {
    throw new Error(NOT_IMPLEMENTED)
  }
}

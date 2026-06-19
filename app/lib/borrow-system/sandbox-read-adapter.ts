import type { BorrowSystemState } from "@/app/lib/credit-engine"
import type { SandboxReadAdapter } from "./contracts"
import {
  buildBorrowPageData,
  buildPortfolioBorrowData,
  buildWalletReadSnapshot,
  resolveAssetDetailFromState,
  resolvePoolDetailFromState,
} from "./read-model"

export class SandboxBorrowReadAdapter implements SandboxReadAdapter {
  readonly mode = "sandbox" as const
  private readonly state: BorrowSystemState

  constructor({ state }: { state: BorrowSystemState }) {
    this.state = state
  }

  async readWalletSnapshot(walletId: string) {
    return buildWalletReadSnapshot(this.state, walletId)
  }

  async readMarkets() {
    return Object.values(this.state.markets)
  }

  async readBorrowPage(walletId: string) {
    return buildBorrowPageData(this.state, walletId)
  }

  async readPortfolioBorrow(walletId: string) {
    return buildPortfolioBorrowData(this.state, walletId)
  }

  async readPoolDetail(poolId: string) {
    return resolvePoolDetailFromState(this.state, this.resolveWalletId(), poolId)
  }

  async readAssetDetail(assetId: string) {
    return resolveAssetDetailFromState(assetId)
  }

  private resolveWalletId() {
    return Object.keys(this.state.accounts)[0] ?? "demo-wallet"
  }
}

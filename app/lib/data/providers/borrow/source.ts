import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import type { BorrowPageData } from "./types"

export type BorrowPageSource = {
  adapter: DataSourceAdapter
  getBorrowPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<BorrowPageData>>
}

export const mockBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-mock",
  label: "Borrow page mock source",
  mode: "mock",
})

export const liveBorrowPageAdapter = createDataSourceAdapter({
  id: "borrow-live",
  label: "Borrow page live source",
  mode: "live",
})

export const mockBorrowPageSource: BorrowPageSource = {
  adapter: mockBorrowPageAdapter,
  async getBorrowPageData() {
    const walletId = getDefaultWalletProfileId()
    const systemState = buildMockBorrowSystemState(walletId)
    const readAdapter = new SandboxBorrowReadAdapter({ state: systemState })

    return {
      fetchedAt: new Date().toISOString(),
      data: await readAdapter.readBorrowPage(walletId),
    }
  },
}

export const liveBorrowPageSource: BorrowPageSource = {
  adapter: liveBorrowPageAdapter,
  async getBorrowPageData() {
    throw createUnsupportedSourceError(liveBorrowPageAdapter, "getBorrowPageData")
  },
}

import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { SandboxLendReadAdapter } from "@/app/lib/lend-system/sandbox-read-adapter"
import type { LendPageData } from "./types"

export type LendPageSource = {
  adapter: DataSourceAdapter
  getLendPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<LendPageData>>
}

export const mockLendPageAdapter = createDataSourceAdapter({
  id: "lend-mock",
  label: "Lend page mock source",
  mode: "mock",
})

export const liveLendPageAdapter = createDataSourceAdapter({
  id: "lend-live",
  label: "Lend page live source",
  mode: "live",
})

export const mockLendPageSource: LendPageSource = {
  adapter: mockLendPageAdapter,
  async getLendPageData(_context?: DataSourceRequestContext) {
    const walletId = "demo-wallet"
    const state = buildMockLendSystemState(walletId)
    const adapter = new SandboxLendReadAdapter({ state })
    const data = await adapter.readLendPage(walletId)
    return {
      fetchedAt: new Date().toISOString(),
      data,
    }
  },
}

export const liveLendPageSource: LendPageSource = {
  adapter: liveLendPageAdapter,
  async getLendPageData() {
    throw createUnsupportedSourceError(liveLendPageAdapter, "getLendPageData")
  },
}

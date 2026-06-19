import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { buildMockMultiplySystemState } from "@/app/lib/multiply-system/mock"
import { SandboxMultiplyReadAdapter } from "@/app/lib/multiply-system/sandbox-read-adapter"
import type { MultiplyPageData } from "./types"

export type MultiplyPageSource = {
  adapter: DataSourceAdapter
  getMultiplyPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<MultiplyPageData>>
}

export const mockMultiplyPageAdapter = createDataSourceAdapter({
  id: "multiply-mock",
  label: "Multiply page mock source",
  mode: "mock",
})

export const liveMultiplyPageAdapter = createDataSourceAdapter({
  id: "multiply-live",
  label: "Multiply page live source",
  mode: "live",
})

export const mockMultiplyPageSource: MultiplyPageSource = {
  adapter: mockMultiplyPageAdapter,
  async getMultiplyPageData(_context?: DataSourceRequestContext) {
    const walletId = "demo-wallet"
    const state = buildMockMultiplySystemState(walletId)
    const adapter = new SandboxMultiplyReadAdapter({ state })
    const data = await adapter.readMultiplyPage(walletId)
    return {
      fetchedAt: new Date().toISOString(),
      data,
    }
  },
}

export const liveMultiplyPageSource: MultiplyPageSource = {
  adapter: liveMultiplyPageAdapter,
  async getMultiplyPageData() {
    throw createUnsupportedSourceError(liveMultiplyPageAdapter, "getMultiplyPageData")
  },
}

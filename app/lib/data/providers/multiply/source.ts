import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { mockMultiplySharedSource } from "@/app/lib/data/mock/shared/multiply"
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
  async getMultiplyPageData() {
    return {
      fetchedAt: new Date().toISOString(),
      data: {
        markets: mockMultiplySharedSource.getMarkets(),
        lendRows: mockMultiplySharedSource.getLendRows(),
        pageSize: 12,
        tokenBorrowApys: mockMultiplySharedSource.getTokenBorrowApys(),
        tokenLogos: mockMultiplySharedSource.getTokenLogos(),
        tokenSupplyApys: mockMultiplySharedSource.getTokenSupplyApys(),
      },
    }
  },
}

export const liveMultiplyPageSource: MultiplyPageSource = {
  adapter: liveMultiplyPageAdapter,
  async getMultiplyPageData() {
    throw createUnsupportedSourceError(liveMultiplyPageAdapter, "getMultiplyPageData")
  },
}

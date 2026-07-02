import {
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { createCatalogPageSources } from "@/app/lib/data/providers/catalog-page-source"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { buildMultiplyCatalogBaselineState } from "@/app/lib/multiply-system/mock"
import { mergeConvexMultiplySnapshots } from "@/app/lib/multiply-system/market-hydration"
import { fetchMultiplyMarketSnapshots } from "@/app/lib/multiply-system/market-hydration-server"
import type { MultiplyPageData } from "./types"

export type MultiplyPageSource = {
  adapter: DataSourceAdapter
  getMultiplyPageData(context?: DataSourceRequestContext): Promise<DataSourceResponse<MultiplyPageData>>
}

const catalogSources = createCatalogPageSources({
  product: "multiply",
  buildBaselineState: buildMultiplyCatalogBaselineState,
  fetchSnapshots: fetchMultiplyMarketSnapshots,
  mergeSnapshots: mergeConvexMultiplySnapshots,
  readPageData: (state, walletId) => buildMultiplyPageData(walletId, state),
  mockWalletId: "catalog",
})

export const mockMultiplyPageAdapter = catalogSources.mockAdapter
export const liveMultiplyPageAdapter = catalogSources.liveAdapter

export const mockMultiplyPageSource: MultiplyPageSource = {
  adapter: mockMultiplyPageAdapter,
  getMultiplyPageData: (context) => catalogSources.mockSource.getPageData(context),
}

export const liveMultiplyPageSource: MultiplyPageSource = {
  adapter: liveMultiplyPageAdapter,
  getMultiplyPageData: (context) => catalogSources.liveSource.getPageData(context),
}

import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { mockLendSharedSource } from "@/app/lib/data/mock/shared/lend"
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
  async getLendPageData() {
    return {
      fetchedAt: new Date().toISOString(),
      data: {
        tokens: mockLendSharedSource.getTokens(),
        markets: mockLendSharedSource.getMarkets(),
        activity: mockLendSharedSource.getActivity(),
        chartSeries: mockLendSharedSource.getChartSeries(),
        featuredAssets: mockLendSharedSource.getFeaturedAssets(),
        featuredSequence: mockLendSharedSource.getFeaturedSequence(),
        assetGroups: mockLendSharedSource.getAssetGroups(),
      },
    }
  },
}

export const liveLendPageSource: LendPageSource = {
  adapter: liveLendPageAdapter,
  async getLendPageData() {
    throw createUnsupportedSourceError(liveLendPageAdapter, "getLendPageData")
  },
}

import { mockLendSharedSource } from "@/app/lib/data/mock/shared/lend"
import type { LendPageData } from "./types"

export type LendPageSource = {
  getLendPageData(): Promise<LendPageData>
}

export const mockLendPageSource: LendPageSource = {
  async getLendPageData() {
    return {
      tokens: mockLendSharedSource.getTokens(),
      markets: mockLendSharedSource.getMarkets(),
      activity: mockLendSharedSource.getActivity(),
      chartSeries: mockLendSharedSource.getChartSeries(),
      featuredAssets: mockLendSharedSource.getFeaturedAssets(),
      featuredSequence: mockLendSharedSource.getFeaturedSequence(),
      assetGroups: mockLendSharedSource.getAssetGroups(),
    }
  },
}

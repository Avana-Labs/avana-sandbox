import {
  ACTIVITY,
  MARKETS,
  TOKENS,
  mockChartData,
  LEND_ASSET_GROUPS,
  LEND_FEATURED_ASSETS,
  LEND_FEATURED_SEQUENCE,
} from "@/app/lib/data/mock/shared/lend"

export type LendPageData = {
  tokens: typeof TOKENS
  markets: typeof MARKETS
  activity: typeof ACTIVITY
  chartSeries: typeof mockChartData
  featuredAssets: typeof LEND_FEATURED_ASSETS
  featuredSequence: typeof LEND_FEATURED_SEQUENCE
  assetGroups: typeof LEND_ASSET_GROUPS
}

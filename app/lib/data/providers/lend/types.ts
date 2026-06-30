import {
  LEND_ASSET_GROUPS,
  LEND_FEATURED_ASSETS,
  LEND_FEATURED_SEQUENCE,
} from "@/app/lib/data/catalog/lend"
import type { LendFeaturedSnapshot, LendMarketRow } from "@/app/lib/lend-system/read-model"

export type LendToken = {
  symbol: string
  name: string
  balance: number
  price: number
  color: string
  bg: string
  apy: number
  earned: number
  daily: number
  utilization: number
}

export type LendMarket = {
  symbol: string
  name: string
  apy: number
  apyChange24h: number
  tvl: string
  utilization: number
  type: string
  protocol: string
  color: string
  bg: string
  soon: boolean
  event: string | null
}

export type LendActivity = {
  type: string
  asset: string
  amount: string
  date: string
  icon: string
  bg: string
  color: string
}

export type LendChartPoint = {
  time: string
  value: number
}

export type LendPageData = {
  tokens: ReadonlyArray<LendToken>
  markets: ReadonlyArray<LendMarket>
  activity: ReadonlyArray<LendActivity>
  chartSeries: ReadonlyArray<LendChartPoint>
  featuredAssets: typeof LEND_FEATURED_ASSETS
  featuredSequence: ReadonlyArray<(typeof LEND_FEATURED_SEQUENCE)[number]>
  featuredSnapshots: ReadonlyArray<LendFeaturedSnapshot>
  assetGroups: ReadonlyArray<(typeof LEND_ASSET_GROUPS)[number]>
  marketRows: ReadonlyArray<LendMarketRow>
}

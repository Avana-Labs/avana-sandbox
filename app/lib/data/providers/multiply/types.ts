import {
  MULTIPLY_MARKET_ROWS,
  MULTIPLY_TOKEN_BORROW_APYS,
  MULTIPLY_TOKEN_LOGOS,
  MULTIPLY_TOKEN_SUPPLY_APYS,
} from "@/app/lib/data/mock/shared/multiply"
import type { MultiplyTrendingSnapshot } from "@/app/lib/multiply-system/read-model"

export type MultiplyMarket = {
  symbol: string
  name: string
  price: number
  funding: number
  change: number
  volume: number
  maxLeverage: number
  longOi: number
  shortOi: number
}

export type MultiplyPageData = {
  markets: ReadonlyArray<MultiplyMarket>
  lendRows: ReadonlyArray<(typeof MULTIPLY_MARKET_ROWS)[number]>
  trendingSnapshots: ReadonlyArray<MultiplyTrendingSnapshot>
  pageSize: number
  tokenBorrowApys: typeof MULTIPLY_TOKEN_BORROW_APYS
  tokenLogos: typeof MULTIPLY_TOKEN_LOGOS
  tokenSupplyApys: typeof MULTIPLY_TOKEN_SUPPLY_APYS
}

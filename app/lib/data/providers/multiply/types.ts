import {
  MOCK_MARKETS,
  MULTIPLY_MARKET_ROWS,
  MULTIPLY_TOKEN_BORROW_APYS,
  MULTIPLY_TOKEN_LOGOS,
  MULTIPLY_TOKEN_SUPPLY_APYS,
} from "@/app/lib/data/mock/shared/multiply"

export type MultiplyPageData = {
  markets: typeof MOCK_MARKETS
  lendRows: typeof MULTIPLY_MARKET_ROWS
  pageSize: number
  tokenBorrowApys: typeof MULTIPLY_TOKEN_BORROW_APYS
  tokenLogos: typeof MULTIPLY_TOKEN_LOGOS
  tokenSupplyApys: typeof MULTIPLY_TOKEN_SUPPLY_APYS
}

import { mockMultiplySharedSource } from "@/app/lib/data/mock/shared/multiply"
import type { MultiplyPageData } from "./types"

export type MultiplyPageSource = {
  getMultiplyPageData(): Promise<MultiplyPageData>
}

export const mockMultiplyPageSource: MultiplyPageSource = {
  async getMultiplyPageData() {
    return {
      markets: mockMultiplySharedSource.getMarkets(),
      lendRows: mockMultiplySharedSource.getLendRows(),
      pageSize: 12,
      tokenBorrowApys: mockMultiplySharedSource.getTokenBorrowApys(),
      tokenLogos: mockMultiplySharedSource.getTokenLogos(),
      tokenSupplyApys: mockMultiplySharedSource.getTokenSupplyApys(),
    }
  },
}

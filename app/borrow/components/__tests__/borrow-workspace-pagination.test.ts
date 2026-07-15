import { describe, expect, it } from "vitest"
import { paginateBorrowMarkets } from "@/app/borrow/components/borrow-workspace"

describe("paginateBorrowMarkets", () => {
  it("returns a bounded page without repeating markets", () => {
    const markets = Array.from({ length: 25 }, (_, index) => `market-${index + 1}`)

    expect(paginateBorrowMarkets(markets, 0, 12)).toEqual(markets.slice(0, 12))
    expect(paginateBorrowMarkets(markets, 1, 12)).toEqual(markets.slice(12, 24))
    expect(paginateBorrowMarkets(markets, 2, 12)).toEqual(["market-25"])
  })

  it("guards negative pages and invalid page sizes", () => {
    expect(paginateBorrowMarkets(["a", "b"], -1, 0)).toEqual(["a"])
  })
})

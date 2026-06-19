import { describe, expect, it } from "vitest"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { MULTIPLY_MARKET_CATALOG } from "@/app/lib/multiply-system/catalog"

describe("multiply page data", () => {
  it("renders all 20 catalog markets in the explore table rows", () => {
    const page = buildMultiplyPageData("demo-wallet")
    expect(page.lendRows).toHaveLength(20)
    expect(page.lendRows[0]?.protocol).toBeTruthy()
    expect(page.lendRows.some((row) => row.href.includes("wsteth-eth"))).toBe(true)
    expect(MULTIPLY_MARKET_CATALOG).toHaveLength(20)
  })
})

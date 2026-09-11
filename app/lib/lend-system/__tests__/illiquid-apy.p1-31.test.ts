import { describe, expect, it } from "vitest"
import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { catalogMarketToRow } from "@/app/lib/lend-system/read-model"
import { isIlliquidLendMarket } from "@/app/lib/lend-system/illiquid-apy"

describe("illiquid lend APY outliers", () => {
  it("p1-31: shows the real APY for low-TVL RLUSD instead of an 'illiquid' flag", () => {
    const rlusd = LEND_MARKET_CATALOG.find((market) => market.asset.symbol === "RLUSD")
    expect(rlusd).toBeDefined()

    const tvlUsd = rlusd!.totalSupplied * rlusd!.assetPriceUsd
    expect(tvlUsd).toBeCloseTo(150, 0)
    // Still detected as low-TVL, but that no longer suppresses the APY label.
    expect(isIlliquidLendMarket(tvlUsd)).toBe(true)

    const row = catalogMarketToRow(rlusd!)
    expect(row.totalApyLabel).not.toMatch(/illiquid/i)
    expect(row.totalApyLabel).toMatch(/%/)
    expect(row.supplyApyLabel).not.toMatch(/illiquid/i)
  })
})

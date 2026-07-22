import { describe, expect, it } from "vitest"
import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"
import { catalogMarketToRow } from "@/app/lib/lend-system/read-model"
import { isIlliquidLendMarket } from "@/app/lib/lend-system/illiquid-apy"

describe("illiquid lend APY outliers", () => {
  it("p1-31: flags RLUSD 30% APY on ~$150 TVL as unreliable", () => {
    const rlusd = LEND_MARKET_CATALOG.find((market) => market.asset.symbol === "RLUSD")
    expect(rlusd).toBeDefined()

    const tvlUsd = rlusd!.totalSupplied * rlusd!.assetPriceUsd
    expect(tvlUsd).toBeCloseTo(150, 0)
    expect(isIlliquidLendMarket(tvlUsd)).toBe(true)

    const row = catalogMarketToRow(rlusd!)
    expect(row.totalApyLabel).toMatch(/illiquid/i)
    expect(row.totalApyLabel).not.toMatch(/30\.10/)
    expect(row.supplyApyLabel).toMatch(/illiquid/i)
  })
})

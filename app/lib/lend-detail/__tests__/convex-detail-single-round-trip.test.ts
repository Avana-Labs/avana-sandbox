import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { calls } = vi.hoisted(() => ({ calls: [] as string[] }))

vi.mock("@/app/lib/lend-system/market-hydration-server", () => {
  const record = (name: string) => async (): Promise<null> => {
    calls.push(name)
    return null
  }
  return {
    // Settles on a later macrotask, like a real network read.
    fetchLendMarketSnapshot: () => {
      calls.push("snapshot")
      return new Promise((resolve) => setTimeout(() => resolve(null), 0))
    },
    fetchLendRecentTransactions: record("transactions"),
    fetchLendRisk: record("risk"),
    fetchLendContent: record("content"),
    fetchLendRiskParameters: record("riskParameters"),
    fetchLendInterestRateModel: record("interestRateModel"),
    fetchLendMarket: record("market"),
    fetchLendContractAddresses: record("contractAddresses"),
    fetchLendSupplyBorrow: record("supplyBorrow"),
  }
})

import { getLendMarketDetailFromConvex } from "@/app/lib/lend-detail/convex-detail"
import { LEND_MARKET_CATALOG } from "@/app/lib/lend-system/catalog"

describe("lend detail SSR", () => {
  it("issues the snapshot and the detail reads in one parallel batch", async () => {
    const pending = getLendMarketDetailFromConvex(LEND_MARKET_CATALOG[0].marketId)
    // Before the snapshot settles, every other read must already be in flight.
    await Promise.resolve()
    expect(calls).toContain("snapshot")
    expect(calls).toEqual(expect.arrayContaining(["transactions", "risk", "content", "supplyBorrow"]))
    await pending
  })
})

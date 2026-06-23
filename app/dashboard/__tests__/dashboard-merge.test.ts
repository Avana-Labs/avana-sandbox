import { describe, expect, it } from "vitest"
import type { PortfolioLendTabData, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import { mergeLendTabData, mergeMultiplyTabData } from "@/app/dashboard/dashboard-client"

describe("dashboard live data merge", () => {
  it("treats empty live lend arrays as authoritative after all positions close", () => {
    const staticData = {
      investments: [{ id: "static-investment" }],
      positions: [{ id: "static-position" }],
      strategyBuckets: [{ id: "bucket" }],
      history: [{ id: "static-history" }],
      rewardsSummary: { claimableUsd: 12 },
    } as unknown as PortfolioLendTabData
    const liveData = {
      investments: [],
      positions: [],
      strategyBuckets: [],
      history: [],
      rewardsSummary: { claimableUsd: 0 },
    } as unknown as PortfolioLendTabData

    const merged = mergeLendTabData(staticData, liveData)

    expect(merged.investments).toEqual([])
    expect(merged.positions).toEqual([])
    expect(merged.history).toEqual([])
    expect(merged.strategyBuckets).toEqual(staticData.strategyBuckets)
    expect(merged.rewardsSummary).toEqual({ claimableUsd: 0 })
  })

  it("treats empty live multiply arrays as authoritative after all positions close", () => {
    const staticData = {
      creditLines: { totalCollateralUsd: 100 },
      lpCollaterals: [{ id: "static-collateral" }],
      positions: [{ id: "static-position" }],
      openOrders: [{ id: "open" }],
      twapOrders: [{ id: "twap" }],
      history: [{ id: "static-history" }],
    } as unknown as PortfolioMultiplyTabData
    const liveData = {
      creditLines: { totalCollateralUsd: 0 },
      lpCollaterals: [],
      positions: [],
      openOrders: [],
      twapOrders: [],
      history: [],
    } as unknown as PortfolioMultiplyTabData

    const merged = mergeMultiplyTabData(staticData, liveData)

    expect(merged.creditLines).toEqual({ totalCollateralUsd: 0 })
    expect(merged.lpCollaterals).toEqual([])
    expect(merged.positions).toEqual([])
    expect(merged.history).toEqual([])
    expect(merged.openOrders).toEqual(staticData.openOrders)
    expect(merged.twapOrders).toEqual(staticData.twapOrders)
  })
})

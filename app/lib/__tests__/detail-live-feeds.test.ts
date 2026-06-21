import { describe, expect, it } from "vitest"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { aggregateMultiplyMarketActivity, mergeMultiplyDetailWithSession } from "@/app/lib/detail-live-feeds"
import { buildMockMultiplySystemStateWithSeedPosition } from "@/app/lib/multiply-system/mock"

describe("detail live feeds", () => {
  it("merges session market liquidity and position totals into multiply detail stats", () => {
    const state = buildMockMultiplySystemStateWithSeedPosition()
    const detail = getMultiplyMarketDetail("eth-usdt")
    expect(detail).toBeTruthy()

    const activity = aggregateMultiplyMarketActivity(state, "eth-usdt")
    const merged = mergeMultiplyDetailWithSession(detail!, state)

    expect(merged.quickStats.find((stat) => stat.id === "available")?.value).toContain("$")
    expect(merged.supplyBorrow.supplied.aggregate).toBeGreaterThanOrEqual(activity.tvlUsd > 0 ? activity.tvlUsd : 0)
    expect(merged.engagement.primary.valueLabel).toBe(String(activity.activePositions))
  })
})

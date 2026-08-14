import { describe, expect, it } from "vitest"
import { buildEmptyChartFeed, buildWalletPositionFeed } from "../wallet-position-feed"

describe("wallet position chart feed", () => {
  it("reconstructs wallet value changes from transactions", () => {
    const feed = buildWalletPositionFeed(125, [
      { timestamp: 1, deltaUsd: 100 },
      { timestamp: 2, deltaUsd: 50 },
      { timestamp: 3, deltaUsd: -25 },
    ])
    expect(feed.rangeData.All.map((point) => point.value)).toEqual([0, 100, 150, 125])
    expect(feed.headlineValue).toBe("$125.00")
  })

  it("does not invent history when connected data is missing", () => {
    const feed = buildEmptyChartFeed()
    expect(feed.rangeData.All).toHaveLength(1)
    expect(feed.rangeData.All[0]?.value).toBe(0)
  })
})

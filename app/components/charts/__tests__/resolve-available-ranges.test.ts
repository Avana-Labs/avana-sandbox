import { describe, expect, it } from "vitest"
import { buildRangeData, resolveAvailableRanges } from "../chart-data"
import type { ChartPoint, ChartRangeData } from "../types"

function pts(n: number): ChartPoint[] {
  return Array.from({ length: n }, (_, i) => ({ time: i, value: 100 + i, label: `p${i}` }))
}

// Mirrors buildHeroFeedFromConvexSeries: daily granularity, so 1H/1D are duplicate 2-point lines.
const dailyGranularityFeed: ChartRangeData = {
  "1H": pts(2),
  "1D": pts(2),
  "1W": pts(7),
  "1M": pts(30),
  "1Y": pts(365),
  All: pts(365),
}

describe("resolveAvailableRanges", () => {
  it("hides the sparse duplicate 1H/1D ranges on a daily-granularity feed", () => {
    const ranges = resolveAvailableRanges(dailyGranularityFeed)
    expect(ranges).not.toContain("1H")
    expect(ranges).not.toContain("1D")
    expect(ranges).toContain("1W")
    expect(ranges).toContain("1M")
    expect(ranges).toContain("All")
  })

  it("keeps every range for a rich mock feed (all ranges populated)", () => {
    const ranges = resolveAvailableRanges(buildRangeData(1000, 40))
    expect(ranges).toEqual(["1H", "1D", "1W", "1M", "1Y", "All"])
  })

  it("never returns an empty set even when every range is sparse", () => {
    const sparse: ChartRangeData = {
      "1H": pts(1),
      "1D": pts(2),
      "1W": pts(2),
      "1M": pts(1),
      "1Y": pts(0),
      All: pts(2),
    }
    const ranges = resolveAvailableRanges(sparse)
    expect(ranges.length).toBeGreaterThanOrEqual(1)
  })
})

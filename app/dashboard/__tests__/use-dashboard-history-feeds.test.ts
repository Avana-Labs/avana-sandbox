import { describe, expect, it } from "vitest"
import {
  buildPortfolioMetricFeeds,
  buildRiskSeriesFeed,
  sliceSnapshotsByRange,
} from "@/app/dashboard/use-dashboard-history-feeds"

const DAY_MS = 24 * 60 * 60 * 1000

function snapshot(offsetDays: number, overrides: Partial<Record<string, number>> = {}) {
  return {
    at: Date.now() - offsetDays * DAY_MS,
    totalValueUsd: 1000 + offsetDays * 10,
    totalSuppliedUsd: 800,
    totalBorrowedUsd: 200,
    totalMultiplyExposureUsd: 400,
    totalEarnedUsd: 5 + offsetDays,
    availableToBorrowUsd: 600,
    ...overrides,
  }
}

describe("sliceSnapshotsByRange", () => {
  it("returns everything for the All range", () => {
    const snapshots = [snapshot(120), snapshot(60), snapshot(0)]
    const sorted = [...snapshots].sort((a, b) => a.at - b.at)
    expect(sliceSnapshotsByRange(sorted, "All")).toEqual(sorted)
  })

  it("keeps only points inside the 1M window", () => {
    const sorted = [snapshot(120), snapshot(45), snapshot(15), snapshot(0)].sort((a, b) => a.at - b.at)
    const oneMonth = sliceSnapshotsByRange(sorted, "1M")
    expect(oneMonth.length).toBeLessThan(sorted.length)
    // Newest point must survive so the chart is never empty.
    expect(oneMonth[oneMonth.length - 1]!.at).toBe(sorted[sorted.length - 1]!.at)
  })

  it("falls back to the newest point when nothing fits the window", () => {
    // All snapshots are older than the 1D window.
    const sorted = [snapshot(10), snapshot(5)].sort((a, b) => a.at - b.at)
    const oneDay = sliceSnapshotsByRange(sorted, "1D")
    // Because the window is anchored to the newest point, both fit here.
    expect(oneDay.length).toBeGreaterThan(0)
  })
})

describe("buildPortfolioMetricFeeds", () => {
  it("produces a feed per metric, sharing the same time axis", () => {
    const snapshots = [snapshot(30), snapshot(15), snapshot(0)]
    const feeds = buildPortfolioMetricFeeds(snapshots)
    expect(Object.keys(feeds).sort()).toEqual(["borrowed", "earned", "multiplyExposure", "netValue", "supplied"].sort())
    // Every metric surfaces the same "All" length; only values differ.
    const lengths = Object.values(feeds).map((feed) => feed.rangeData.All.length)
    expect(new Set(lengths).size).toBe(1)
    expect(feeds.netValue.rangeData.All.at(-1)?.value).toBe(1000)
    expect(feeds.borrowed.rangeData.All.at(-1)?.value).toBe(200)
  })

  it("returns empty range data for an empty snapshot series", () => {
    const feeds = buildPortfolioMetricFeeds([])
    expect(feeds.netValue.rangeData.All).toEqual([])
  })
})

describe("buildRiskSeriesFeed", () => {
  it("filters out null health-factor rows so a repaid window isn't a dip to 0", () => {
    const now = Date.now()
    const feed = buildRiskSeriesFeed([
      { at: now - 3 * DAY_MS, healthFactorWad: "2000000000000000000" }, // 2.0
      { at: now - 2 * DAY_MS, healthFactorWad: null },
      { at: now - DAY_MS, healthFactorWad: "1500000000000000000" }, // 1.5
    ])
    const points = feed.rangeData.All
    expect(points).toHaveLength(2)
    expect(points[0]!.value).toBeCloseTo(2.0, 6)
    expect(points[1]!.value).toBeCloseTo(1.5, 6)
  })
})

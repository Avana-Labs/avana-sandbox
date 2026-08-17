import { describe, expect, it } from "vitest"
import { feedFromSnapshots } from "@/app/dashboard/use-dashboard-portfolio-feed"

const snap = (at: number, totalValueUsd: number) => ({ at, totalValueUsd })

describe("dashboard hero feed — no fabricated delta (D1)", () => {
  it("a flat stored series on an off-basis does NOT invent a gain", () => {
    // Stored history flat at 900; live headline 1000 (within the 25% basis tolerance).
    // The old code delta'd stored-first (900) against live-last (1000) → fake +$100/+11%.
    const feed = feedFromSnapshots([snap(1, 900), snap(2, 900), snap(3, 900)], 1000)
    expect(feed.headlineDelta).toContain("(0.00%)")
    // Every rebased point lands on the live basis, so there is no jump.
    const values = feed.rangeData["1M"].map((p) => p.value)
    expect(new Set(values)).toEqual(new Set([1000]))
  })

  it("preserves a REAL movement inside the stored series", () => {
    // Genuine rise 800 → 900 stored, live 1000. Rebase offset = +100 → 900 → 1000,
    // so the real +100 (11.11%) change is preserved, not doubled or erased.
    const feed = feedFromSnapshots([snap(1, 800), snap(2, 900)], 1000)
    expect(feed.headlineDelta).toContain("(11.11%)")
    expect(feed.deltaTone).toBe("positive")
    expect(feed.rangeData["1M"].at(-1)?.value).toBe(1000)
    expect(feed.rangeData["1M"][0]?.value).toBe(900)
  })

  it("falls back to a flat current point when the newest snapshot is wildly off-basis", () => {
    const feed = feedFromSnapshots([snap(1, 500)], 1000) // |500-1000| > 25% of 1000
    expect(feed.headlineDelta).toContain("(0.00%)")
    expect(feed.rangeData["1M"]).toHaveLength(1)
  })
})

import { describe, expect, it } from "vitest"
import { syncRelatedAvailable } from "@/app/lib/borrow-detail/convex-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { RelatedPoolSummary } from "@/app/lib/borrow-detail/types"

const visual = (symbol: string) => ({ symbol, shortLabel: symbol, bgClass: "", textClass: "" })

const card = (id: string, availableLabel: string): RelatedPoolSummary => ({
  id,
  name: id,
  venue: "Uniswap v3",
  visuals: [visual("WETH"), visual("USDC")],
  aprLabel: "3.2% – 5.1%",
  availableLabel,
})

const poolSnap = (slug: string, availableUsd: number): ConvexMarketSnapshot => ({
  slug,
  scope: "pool",
  suppliedUsd: 0,
  borrowedUsd: 0,
  availableUsd,
  utilizationPct: 0,
  supplyApyPct: 0,
  borrowAprPct: 0,
  tvlUsd: 0,
  volumeUsd: 0,
  feesUsd: 0,
})

describe("syncRelatedAvailable", () => {
  it("restates a related card's Available from the sibling's own Convex snapshot", () => {
    // Card carries the inflated catalog label; the sibling's real snapshot is 5.4M.
    const [out] = syncRelatedAvailable([card("pool-a", "$29.0M")], [poolSnap("pool-a", 5_400_000)])
    // Equals what pool-a's own detail page shows for "Available to borrow".
    expect(out.availableLabel).toBe(formatCompactUsd(5_400_000))
    expect(out.availableLabel).not.toBe("$29.0M")
  })

  it("matches across several pools", () => {
    const cards = [card("pool-a", "$29.0M"), card("pool-b", "$12.0M"), card("pool-c", "$8.0M")]
    const snaps = [poolSnap("pool-a", 5_400_000), poolSnap("pool-b", 2_100_000), poolSnap("pool-c", 990_000)]
    const out = syncRelatedAvailable(cards, snaps)
    expect(out.map((c) => c.availableLabel)).toEqual([
      formatCompactUsd(5_400_000),
      formatCompactUsd(2_100_000),
      formatCompactUsd(990_000),
    ])
  })

  it("leaves a card untouched when its sibling has no pool snapshot", () => {
    const [out] = syncRelatedAvailable([card("pool-x", "$7.0M")], [poolSnap("pool-a", 5_400_000)])
    expect(out.availableLabel).toBe("$7.0M")
  })

  it("is a no-op when there are no pool snapshots (falls back to catalog labels)", () => {
    const cards = [card("pool-a", "$29.0M")]
    expect(syncRelatedAvailable(cards, [])).toBe(cards)
  })
})

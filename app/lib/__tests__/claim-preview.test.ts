import { describe, expect, it } from "vitest"
import { calculateClaimPreview, type HomeClaimPosition } from "@/app/lib/home-sim"

const visual = { symbol: "X", shortLabel: "X", bgClassName: "bg-x", textClassName: "text-x" }

const position: HomeClaimPosition = {
  id: "claim-eth-usdc",
  poolId: "pool-eth-usdc",
  name: "ETH / USDC",
  subtitle: "Uniswap",
  totalUsd: 142,
  breakdown: [
    { id: "eth", symbol: "ETH", amountLabel: "0.02 ETH", usdValue: 68.99, visual },
    { id: "usdc", symbol: "USDC", amountLabel: "42.11 USDC", usdValue: 42.11, visual },
    { id: "fees", symbol: "Fees", amountLabel: "$30.90", usdValue: 30.9, visual },
  ],
}

describe("calculateClaimPreview", () => {
  it("itemized breakdown reconciles with the headline claim total (fees included)", () => {
    const preview = calculateClaimPreview(
      [position],
      { [position.id]: position.totalUsd },
      { [position.id]: true },
      null,
    )

    const rowsSum = Object.values(preview.tokenTotals).reduce((sum, value) => sum + value, 0)
    // Previously the "Fees" line was dropped from the breakdown, so the rows summed
    // to $111.10 while the headline claimed $142. They must now reconcile.
    expect(rowsSum).toBeCloseTo(preview.selectedTotalUsd, 6)
    expect(rowsSum).toBeCloseTo(142, 6)
    expect(preview.effectiveClaimUsd).toBeCloseTo(142, 6)
    // The fee line is represented in the breakdown.
    expect(preview.tokenTotals.Fees).toBeCloseTo(30.9, 6)
  })

  it("excludes unselected positions", () => {
    const preview = calculateClaimPreview(
      [position],
      { [position.id]: position.totalUsd },
      { [position.id]: false },
      null,
    )
    expect(preview.hasSelection).toBe(false)
    expect(preview.selectedTotalUsd).toBe(0)
    expect(Object.keys(preview.tokenTotals)).toHaveLength(0)
  })
})

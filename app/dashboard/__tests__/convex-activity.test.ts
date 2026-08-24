import { describe, expect, it } from "vitest"
import {
  mapConvexActivityItemsToRows,
  mergeActivityRows,
  type ConvexActivityItem,
} from "@/app/dashboard/convex-activity"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"

function makeConvex(overrides: Partial<ConvexActivityItem> & Pick<ConvexActivityItem, "id" | "hash">): ConvexActivityItem {
  return {
    source: "transaction",
    product: "umbrella",
    kind: "stake",
    status: "success",
    amountUsd: 1000,
    marketSlug: "weth",
    at: Date.parse("2026-06-19T12:00:00.000Z"),
    ...overrides,
  }
}

describe("mapConvexActivityItemsToRows", () => {
  it("maps Convex activity into dashboard rows", () => {
    expect(mapConvexActivityItemsToRows([makeConvex({ id: "tx-1", hash: "sim-1" })])).toEqual([
      {
        id: "tx-1",
        at: "2026-06-19T12:00:00.000Z",
        product: "umbrella",
        kind: "stake",
        status: "confirmed",
        amountUsd: 1000,
        primaryLabel: "weth",
        secondaryLabel: "Stake",
        txHash: "sim-1",
      },
    ])
  })

  it("normalizes deposit/multiply/deleverage kinds", () => {
    const rows = mapConvexActivityItemsToRows([
      makeConvex({ id: "1", hash: "a", product: "lend", kind: "deposit" }),
      makeConvex({ id: "2", hash: "b", product: "multiply", kind: "multiply" }),
      makeConvex({ id: "3", hash: "c", product: "multiply", kind: "deleverage" }),
    ])
    expect(rows.map((row) => row.kind)).toEqual(["supply", "open", "reduce"])
  })
})

describe("mergeActivityRows", () => {
  it("keeps distinct rows that share a tx hash and prefers seed labels", () => {
    const seed: PortfolioActivityRow[] = [
      {
        id: "seed-weth",
        at: "2026-06-19T12:00:00.000Z",
        product: "umbrella",
        kind: "stake",
        status: "confirmed",
        amountUsd: 6700,
        primaryLabel: "Staked WETH",
        secondaryLabel: "3.4747 WETH",
        txHash: "sim-shared",
      },
    ]
    const convex = mapConvexActivityItemsToRows([
      makeConvex({ id: "seed-weth", hash: "sim-shared", marketSlug: "weth", amountUsd: 6700 }),
      makeConvex({ id: "convex-usdc", hash: "sim-shared", marketSlug: "usdc", amountUsd: 8000 }),
    ])

    const merged = mergeActivityRows(seed, convex)
    expect(merged).toHaveLength(2)
    expect(merged.find((row) => row.id === "seed-weth")?.primaryLabel).toBe("Staked WETH")
    expect(merged.find((row) => row.id === "convex-usdc")?.primaryLabel).toBe("usdc")
  })
})

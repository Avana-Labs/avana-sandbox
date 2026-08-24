import { describe, expect, it } from "vitest"
import {
  mapConvexActivityItemsToRows,
  mergeActivityRows,
  type ConvexActivityItem,
} from "@/app/dashboard/convex-activity"
import type { PortfolioActivityRow } from "@/app/lib/data/providers/portfolio"

function makeConvex(
  overrides: Partial<ConvexActivityItem> & Pick<ConvexActivityItem, "id" | "hash">,
): ConvexActivityItem {
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
        marketId: "weth",
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

  it("maps persisted onboarding grants to received sandbox funds", () => {
    const rows = mapConvexActivityItemsToRows([
      makeConvex({
        source: "sandboxActivity",
        id: "asset-grant",
        hash: "sim-onboarding-asset",
        product: "onboarding",
        kind: "starterAssetGrant",
        marketSlug: "usdc",
        amountUsd: 25_000,
      }),
      makeConvex({
        source: "sandboxActivity",
        id: "claim",
        hash: "sim-onboarding",
        product: "onboarding",
        kind: "onboardingClaim",
        marketSlug: null,
        amountUsd: 1_000_000,
      }),
    ])

    expect(rows).toEqual([
      expect.objectContaining({
        product: "onboarding",
        kind: "claim",
        primaryLabel: "USDC sandbox funds",
        secondaryLabel: "Sandbox funds received",
        amountUsd: 25_000,
        marketId: "usdc",
      }),
      expect.objectContaining({
        product: "onboarding",
        kind: "claim",
        primaryLabel: "Sandbox portfolio funded",
        secondaryLabel: "Onboarding grant",
        amountUsd: 1_000_000,
      }),
    ])
  })

  it("normalizes legacy Umbrella sandbox activity kinds", () => {
    const [row] = mapConvexActivityItemsToRows([
      makeConvex({
        source: "sandboxActivity",
        id: "activity-copy",
        hash: "sim-umbrella-stake-weth",
        product: "onboarding",
        kind: "umbrella_stake",
      }),
    ])
    expect(row).toMatchObject({ product: "umbrella", kind: "stake", marketId: "weth" })
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
        marketId: "weth",
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

  it("collapses cross-store copies but preserves same-hash actions for other markets", () => {
    const seed: PortfolioActivityRow[] = [
      {
        id: "session-weth",
        at: "2026-06-19T12:00:00.000Z",
        product: "umbrella",
        kind: "stake",
        status: "confirmed",
        amountUsd: 6700,
        primaryLabel: "Staked WETH",
        secondaryLabel: "3.4747 WETH",
        txHash: "sim-shared",
        marketId: "weth",
      },
    ]
    const convex = mapConvexActivityItemsToRows([
      makeConvex({ id: "durable-weth", hash: "sim-shared", marketSlug: "weth", amountUsd: 6700 }),
      makeConvex({ id: "durable-usdc", hash: "sim-shared", marketSlug: "usdc", amountUsd: 8000 }),
    ])

    const merged = mergeActivityRows(seed, convex)
    expect(merged.map((row) => row.id).sort()).toEqual(["durable-usdc", "session-weth"])
  })
})

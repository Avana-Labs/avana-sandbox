import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { applyBorrowAction } from "@/app/lib/credit-engine/actions"
import {
  EXAMPLE_UNI_MARKET_ID,
  EXAMPLE_UNI_USDC_ASSET_ID,
  makeExampleBorrowSystemState,
} from "@/app/lib/credit-engine/__tests__/fixtures"
import { buildBorrowDashboardMetrics } from "@/app/portfolio/dashboard-tab-metrics"

// One dollar of rounding tolerance for share-index arithmetic.
const TOLERANCE = 1

describe("credit overview Net Value stays flat on net-neutral actions", () => {
  it("does not drift when borrowing (cash received offsets debt owed)", () => {
    const state = makeExampleBorrowSystemState()
    const before = buildBorrowDashboardMetrics(state, "wallet-1").overview.netValueUsd

    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("16", 6),
    })
    const after = buildBorrowDashboardMetrics(next, "wallet-1").overview.netValueUsd

    expect(Math.abs(after - before)).toBeLessThanOrEqual(TOLERANCE)
  })

  it("does not drift when removing fairly-valued collateral (value moves into LP balance)", () => {
    const state = makeExampleBorrowSystemState()
    const before = buildBorrowDashboardMetrics(state, "wallet-1").overview.netValueUsd

    const next = applyBorrowAction(state, {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      amountUsd6: parseFixed("210", 6),
    })
    const after = buildBorrowDashboardMetrics(next, "wallet-1").overview.netValueUsd

    // Before this fix the LP balance the collateral moved into was uncounted, so
    // Net Value fell by the full ~$210 removed.
    expect(Math.abs(after - before)).toBeLessThanOrEqual(TOLERANCE)
  })

  it("does not drift when fully removing a collateral market that leaves no position row behind", () => {
    const state = makeExampleBorrowSystemState()
    const before = buildBorrowDashboardMetrics(state, "wallet-1").overview.netValueUsd

    const next = applyBorrowAction(state, {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:curve-eth-usdt",
      percentBps: 10_000,
    })
    const after = buildBorrowDashboardMetrics(next, "wallet-1").overview.netValueUsd

    expect(next.accounts["wallet-1"]!.collateralPositions.some((position) => position.id === "wallet-1:curve-eth-usdt")).toBe(false)
    expect(Math.abs(after - before)).toBeLessThanOrEqual(TOLERANCE)
  })

  it("does not drift when re-supplying LP that was first returned from collateral removal", () => {
    const state = makeExampleBorrowSystemState()
    const before = buildBorrowDashboardMetrics(state, "wallet-1").overview.netValueUsd

    const afterRemove = applyBorrowAction(state, {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      amountUsd6: parseFixed("1000", 6),
    })

    const next = applyBorrowAction(afterRemove, {
      type: "supplyCollateral",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      amountUsd6: parseFixed("1000", 6),
    })
    const after = buildBorrowDashboardMetrics(next, "wallet-1").overview.netValueUsd

    expect(Math.abs(after - before)).toBeLessThanOrEqual(TOLERANCE)
  })
})

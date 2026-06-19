import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("supply collateral flow", () => {
  it("completes deposit LP via action box and increases collateral", async () => {
    const harness = createBorrowFlowHarness()
    const collateralBefore = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares

    const { executeResult } = await runBorrowActionBoxFlow(harness, {
      type: "supplyCollateral",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      amountUsd6: parseFixed("1000", 6),
    })

    const collateralAfter = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares

    expect(executeResult?.historyItem.kind).toBe("deposit")
    expect(collateralAfter).toBeGreaterThan(collateralBefore)
  })
})

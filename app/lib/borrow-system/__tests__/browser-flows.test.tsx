import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, EXAMPLE_WALLET_1_DEBT_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("browser borrow repay withdraw flows", () => {
  it("completes borrow and updates read model", async () => {
    const harness = createBorrowFlowHarness()
    await runBorrowActionBoxFlow(harness, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("200", 6),
    })
    expect(harness.getState().transactions.at(-1)?.kind).toBe("borrow")
  })

  it("completes repay and reduces debt", async () => {
    const harness = createBorrowFlowHarness()
    const before = harness.getState().accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6
    await runBorrowActionBoxFlow(harness, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("100", 6),
    })
    const after = harness.getState().accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6
    expect(after).toBeLessThan(before)
  })
})

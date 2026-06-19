import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, EXAMPLE_WALLET_1_DEBT_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("detail sidebar flows", () => {
  it("runs repay through adapter-backed action box contract used by detail sidebars", async () => {
    const harness = createBorrowFlowHarness()

    const { result } = await runBorrowActionBoxFlow(harness, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("100", 6),
    })

    expect(result.current.previewUi?.allowed).toBe(true)
    expect(result.current.successUi?.receipt.actionType).toBe("repay")
  })

  it("runs borrow through adapter-backed action box contract used by pool sidebars", async () => {
    const harness = createBorrowFlowHarness()

    const { result } = await runBorrowActionBoxFlow(harness, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("150", 6),
    })

    expect(result.current.successUi?.receipt.actionType).toBe("borrow")
  })
})

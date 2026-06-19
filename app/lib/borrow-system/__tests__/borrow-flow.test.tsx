import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("borrow flow", () => {
  it("preview → action box → simulated receipt → history → state update", async () => {
    const harness = createBorrowFlowHarness()

    const { result, executeResult } = await runBorrowActionBoxFlow(harness, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    expect(result.current.stage).toBe("success")
    expect(result.current.previewUi?.allowed).toBe(true)
    expect(executeResult?.receipt.simulated).toBe(true)
    expect(executeResult?.receipt.hash).toMatch(/^sim/)
    expect(executeResult?.historyItem.kind).toBe("borrow")
    expect(harness.getState().transactions.at(-1)?.kind).toBe("borrow")
    expect(result.current.successUi?.receipt.hash).toBe(executeResult?.receipt.hash)
  })
})

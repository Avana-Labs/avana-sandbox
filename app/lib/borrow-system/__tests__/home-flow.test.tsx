import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("home borrow flow", () => {
  it("runs borrow through adapter-backed action box contract used by home flows", async () => {
    const harness = createBorrowFlowHarness()

    const { result } = await runBorrowActionBoxFlow(harness, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("200", 6),
    })

    expect(result.current.previewUi?.rows.some((row) => row.label === "Health factor")).toBe(true)
    expect(result.current.successUi?.receipt.simulated).toBe(true)
  })
})

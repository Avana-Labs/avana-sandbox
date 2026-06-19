import { describe, expect, it } from "vitest"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("portfolio borrow integration", () => {
  it("updates portfolio borrow read model after simulated borrow", async () => {
    const harness = createBorrowFlowHarness()

    await runBorrowActionBoxFlow(harness, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    const readAdapter = new SandboxBorrowReadAdapter({ state: harness.getState() })
    const portfolio = await readAdapter.readPortfolioBorrow("wallet-1")

    expect(portfolio.creditLines.totalBorrowedUsd).toBeGreaterThan(4200)
    expect(portfolio.debtPositions.length).toBeGreaterThan(0)
    expect(portfolio.debtPositions[0]?.borrowedUsd).toBeGreaterThan(4200)
  })
})

import { describe, expect, it } from "vitest"
import { EXAMPLE_WALLET_1_DEBT_ID } from "@/app/lib/credit-engine/__tests__/fixtures"
import { createBorrowFlowHarness, parseFixed, runBorrowActionBoxFlow } from "./flow.harness"

describe("repay flow", () => {
  it("completes simulated repay and decreases debt", async () => {
    const harness = createBorrowFlowHarness()
    const debtBefore = harness.getState().accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6

    const { executeResult } = await runBorrowActionBoxFlow(harness, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("250", 6),
    })

    const debtAfter = harness.getState().accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6

    expect(executeResult?.historyItem.kind).toBe("repay")
    expect(debtAfter).toBeLessThan(debtBefore)
    expect(executeResult?.preview.after.totalBorrowedUsd6).toBeLessThan(executeResult?.preview.before.totalBorrowedUsd6)
  })
})

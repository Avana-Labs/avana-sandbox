import { describe, expect, it } from "vitest"
import { makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"
import { makeExampleMultiplySystemState } from "@/app/lib/multiply-engine/__tests__/fixtures"
import { SandboxMultiplyReadAdapter } from "@/app/lib/multiply-system/sandbox-read-adapter"
import { SandboxMultiplyTransactionAdapter } from "@/app/lib/multiply-system/sandbox-transaction-adapter"

describe("SandboxMultiplyReadAdapter", () => {
  it("loads 20 markets and wallet-specific positions", async () => {
    const state = makeExampleMultiplySystemState()
    const adapter = new SandboxMultiplyReadAdapter({ state })

    const markets = await adapter.readMarkets()
    expect(markets).toHaveLength(20)

    const portfolio = await adapter.readPortfolioMultiply("wallet-1")
    expect(portfolio.positions.length).toBeGreaterThan(0)

    const page = await adapter.readMultiplyPage("wallet-1")
    expect(page.lendRows).toHaveLength(20)
  })
})

describe("SandboxMultiplyTransactionAdapter", () => {
  it("simulates multiply and deleverage without touching borrow state", async () => {
    const borrowState = makeExampleBorrowSystemState()
    let multiplyState = makeExampleMultiplySystemState()
    const position = Object.values(multiplyState.positions)[0]!

    const adapter = new SandboxMultiplyTransactionAdapter({
      readState: () => multiplyState,
      writeState: (nextState) => {
        multiplyState = nextState
      },
      now: () => 1_718_800_000_000,
      generateId: (() => {
        let count = 0
        return (prefix: string) => `${prefix}-${++count}`
      })(),
    })

    const multiplyIntent = adapter.createIntent({
      type: "multiply",
      walletId: "wallet-2",
      marketId: "eth-usdt",
      collateralAmount: 0.5,
      selectedMultiplier: 2,
    })
    const multiplyResult = await adapter.executeTransaction(multiplyIntent)
    expect(multiplyResult.receipt.simulated).toBe(true)
    expect(multiplyResult.receipt.status).toBe("success")

    const deleverageIntent = adapter.createIntent({
      type: "deleverage",
      walletId: position.walletId,
      positionId: position.id,
      targetMultiplier: 1.8,
    })
    const deleverageResult = await adapter.executeTransaction(deleverageIntent)
    expect(deleverageResult.receipt.status).toBe("success")
    expect(deleverageResult.preview.after.debtValueUsd).toBeLessThan(deleverageResult.preview.before.debtValueUsd)

    expect(borrowState.accounts["wallet-1"]?.debtPositions.length).toBeGreaterThan(0)
    expect(Object.keys(multiplyState.positions).length).toBeGreaterThan(0)
  })
})

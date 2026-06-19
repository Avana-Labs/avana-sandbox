import { describe, expect, it } from "vitest"
import { parseFixed, type BorrowAction } from "@/app/lib/credit-engine"
import { SandboxTransactionAdapter } from "@/app/lib/borrow-system/sandbox-transaction-adapter"
import { EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, EXAMPLE_WALLET_1_DEBT_ID, makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"

function createHarness() {
  const seed = makeExampleBorrowSystemState()
  let state = seed

  const adapter = new SandboxTransactionAdapter({
    readState: () => state,
    writeState: (nextState) => {
      state = nextState
    },
    now: () => 1_718_800_000_000,
    generateId: (() => {
      let count = 0
      return (prefix: string) => `${prefix}-${++count}`
    })(),
  })

  return {
    adapter,
    seed,
    getState: () => state,
  }
}

describe("sandbox transaction adapter", () => {
  it("creates a transaction intent for deposit lp and returns a simulated receipt on execution", async () => {
    const { adapter, getState } = createHarness()
    const action: BorrowAction = {
      type: "supplyCollateral",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      amountUsd6: parseFixed("1000", 6),
    }

    const intent = adapter.createIntent(action)
    const preview = await adapter.previewTransaction(intent)
    const result = await adapter.executeTransaction(intent)

    expect(intent.actionType).toBe("deposit")
    expect(preview.allowed).toBe(true)
    expect(result.receipt.simulated).toBe(true)
    expect(result.historyItem.simulated).toBe(true)
    expect(getState().transactions.at(-1)?.kind).toBe("deposit")
  })

  it("creates a borrow intent, previews through the credit engine, and updates mock state consistently", async () => {
    const { adapter, getState } = createHarness()
    const intent = adapter.createIntent({
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    const preview = await adapter.previewTransaction(intent)
    const result = await adapter.executeTransaction(intent)

    expect(preview.allowed).toBe(true)
    expect(preview.after.totalBorrowedUsd6).toBeGreaterThan(preview.before.totalBorrowedUsd6)
    expect(result.receipt.actionType).toBe("borrow")
    expect(result.result.simulated).toBe(true)
    expect(result.state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6).toBeGreaterThan(parseFixed("4200", 6))
    expect(getState().transactions.at(-1)?.kind).toBe("borrow")
  })

  it("creates a repay intent and records simulated history", async () => {
    const { adapter, getState } = createHarness()
    const intent = adapter.createIntent({
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("250", 6),
    })

    const result = await adapter.executeTransaction(intent)

    expect(result.historyItem.kind).toBe("repay")
    expect(result.historyItem.simulated).toBe(true)
    expect(getState().transactions.at(-1)?.kind).toBe("repay")
  })

  it("creates a withdraw intent and blocks unsafe withdrawals before mutating state", async () => {
    const { adapter, seed, getState } = createHarness()
    const safeIntent = adapter.createIntent({
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      amountUsd6: parseFixed("1000", 6),
    })

    const safeResult = await adapter.executeTransaction(safeIntent)
    expect(safeResult.historyItem.kind).toBe("withdraw")

    const blockedIntent = adapter.createIntent({
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      percentBps: 10_000,
    })

    const blockedPreview = await adapter.previewTransaction(blockedIntent)
    expect(blockedPreview.allowed).toBe(false)
    expect(getState().transactions.length).toBe(seed.transactions.length + 1)
  })

  it("creates a liquidation preview intent without mutating source state during preview", async () => {
    const { adapter, getState } = createHarness()
    const state = getState()
    state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = parseFixed("18000", 6)
    state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = parseFixed("18000", 6)
    const beforeTransactions = state.transactions.length

    const intent = adapter.createIntent({
      type: "liquidate",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      repayAmountUsd6: parseFixed("2000", 6),
    })

    const preview = await adapter.previewTransaction(intent)
    expect(preview.allowed).toBe(true)
    expect(getState().transactions).toHaveLength(beforeTransactions)
  })

  it("resets sandbox state back to the original seed", async () => {
    const { adapter, seed, getState } = createHarness()
    const intent = adapter.createIntent({
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    await adapter.executeTransaction(intent)
    expect(getState().transactions.length).toBeGreaterThan(seed.transactions.length)

    adapter.resetSandboxState()
    expect(getState()).toEqual(seed)
  })
})

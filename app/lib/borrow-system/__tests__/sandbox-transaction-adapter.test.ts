import { describe, expect, it } from "vitest"
import { parseFixed, type BorrowAction } from "@/app/lib/credit-engine"
import { SandboxTransactionAdapter } from "@/app/lib/borrow-system/sandbox-transaction-adapter"
import {
  EXAMPLE_UNI_MARKET_ID,
  EXAMPLE_UNI_USDC_ASSET_ID,
  EXAMPLE_WALLET_1_DEBT_ID,
  makeExampleBorrowSystemState,
} from "@/app/lib/credit-engine/__tests__/fixtures"
import { assertSandboxActionContract } from "./sandbox-adapter-contract"

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
  it("deposit LP satisfies the sandbox action contract", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "supplyCollateral",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      amountUsd6: parseFixed("1000", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "deposit",
      walletId: "wallet-1",
    })

    expect(preview.after.collateralValueUsd6).toBeGreaterThan(preview.before.collateralValueUsd6)
    expect(result.state.transactions.at(-1)?.kind).toBe("deposit")
  })

  it("borrow satisfies the sandbox action contract", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "borrow",
      walletId: "wallet-1",
    })

    expect(preview.after.totalBorrowedUsd6).toBeGreaterThan(preview.before.totalBorrowedUsd6)
    expect(result.state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6).toBeGreaterThan(parseFixed("4200", 6))
  })

  it("repay satisfies the sandbox action contract", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("250", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "repay",
      walletId: "wallet-1",
    })

    expect(preview.after.totalBorrowedUsd6).toBeLessThan(preview.before.totalBorrowedUsd6)
    expect(result.state.transactions.at(-1)?.kind).toBe("repay")
  })

  it("claim satisfies the sandbox action contract", async () => {
    const harness = createHarness()
    const beforeBalance = harness.getState().accounts["wallet-1"]!.walletBalanceUsd6
    const action: BorrowAction = {
      type: "claim",
      walletId: "wallet-1",
      rewardPositionIds: ["claim-eth-usdc"],
      amountUsd6: parseFixed("80", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "claim",
      walletId: "wallet-1",
    })

    expect(preview.allowed).toBe(true)
    expect(preview.before.totalBorrowedUsd6).toBe(preview.after.totalBorrowedUsd6)
    expect(result.state.accounts["wallet-1"]!.walletBalanceUsd6).toBe(beforeBalance + parseFixed("80", 6))
    expect(result.historyItem.kind).toBe("claim")
  })

  it("withdraw satisfies the sandbox action contract for safe removals", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      amountUsd6: parseFixed("1000", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "withdraw",
      walletId: "wallet-1",
    })

    expect(preview.after.collateralValueUsd6).toBeLessThan(preview.before.collateralValueUsd6)
    expect(result.historyItem.kind).toBe("withdraw")
  })

  it("records the executed USD amount for percent-based collateral removals", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      percentBps: 1_000,
    }

    const intent = harness.adapter.createIntent(action)
    const preview = await harness.adapter.previewTransaction(intent)
    const result = await harness.adapter.executeTransaction(intent)

    expect(result.receipt.status).toBe("success")
    expect(result.historyItem.executedAmountUsd6).toBe(preview.before.collateralValueUsd6 - preview.after.collateralValueUsd6)
    expect(result.historyItem.executedAmountUsd6).toBeGreaterThan(0n)
  })

  it("blocks unsafe withdraw before mutating sandbox state", async () => {
    const harness = createHarness()
    const beforeTransactions = harness.getState().transactions.length
    const action: BorrowAction = {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      percentBps: 10_000,
    }

    await assertSandboxActionContract(harness, action, {
      expectedActionType: "withdraw",
      walletId: "wallet-1",
    })

    expect(harness.getState().transactions).toHaveLength(beforeTransactions)
  })

  it("liquidation preview does not mutate state and execute remains preview-only", async () => {
    const harness = createHarness()
    const state = harness.getState()
    state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = parseFixed("18000", 6)
    state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = parseFixed("18000", 6)
    const beforeTransactions = state.transactions.length

    const action: BorrowAction = {
      type: "liquidate",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      repayAmountUsd6: parseFixed("2000", 6),
    }

    const { preview, result } = await assertSandboxActionContract(harness, action, {
      expectedActionType: "liquidate",
      previewOnly: true,
      walletId: "wallet-1",
    })

    expect(preview.allowed).toBe(true)
    expect(preview.riskLabel).toBe("danger")
    expect(result.receipt.error).toContain("preview-only")
    expect(harness.getState().transactions).toHaveLength(beforeTransactions)
  })

  it("reuses cached preview evaluation during execute", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    }

    const intent = harness.adapter.createIntent(action)
    const preview = await harness.adapter.previewTransaction(intent)
    const result = await harness.adapter.executeTransaction(intent)

    expect(result.preview).toBe(preview)
  })

  it("resets sandbox state back to the original seed", async () => {
    const harness = createHarness()
    const action: BorrowAction = {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    }

    await assertSandboxActionContract(harness, action, {
      expectedActionType: "borrow",
      walletId: "wallet-1",
    })
    expect(harness.getState().transactions.length).toBeGreaterThan(harness.seed.transactions.length)

    harness.adapter.resetSandboxState()
    expect(harness.getState()).toEqual(harness.seed)
  })
})

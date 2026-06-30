import { describe, expect, it } from "vitest"
import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult } from "@/app/lib/lend-system/contracts"
import { borrowHistoryItemToRecordArgs, lendResultToRecordArgs } from "../persistence"

const baseItem: TransactionHistoryItem = {
  id: "h1",
  intentId: "intent-1",
  walletId: "0xabc",
  marketId: "uni-v3-bluechip-weth-usdc",
  assetId: "uni-v2:usdc",
  kind: "borrow",
  status: "success",
  requestedAmountUsd6: 1_500_000_000n,
  executedAmountUsd6: 1_500_000_000n,
  simulated: true,
  timestamp: 123,
  hash: "0xsim",
}

describe("borrowHistoryItemToRecordArgs", () => {
  it("maps usd6 bigints to decimal strings and derives human USD", () => {
    const args = borrowHistoryItemToRecordArgs(baseItem, "0xWALLET")
    expect(args).toEqual({
      wallet: "0xWALLET",
      intentId: "intent-1",
      product: "borrow",
      kind: "borrow",
      marketSlug: "uni-v3-bluechip-weth-usdc",
      assetId: "uni-v2:usdc",
      requestedAmountUsd6: "1500000000",
      executedAmountUsd6: "1500000000",
      amountUsd: 1500,
      simulated: true,
    })
  })

  it("preserves the intentId as the idempotency key across a partial execution", () => {
    const partial = { ...baseItem, executedAmountUsd6: 750_000_000n }
    const args = borrowHistoryItemToRecordArgs(partial, "0xWALLET")
    expect(args.requestedAmountUsd6).toBe("1500000000")
    expect(args.executedAmountUsd6).toBe("750000000")
    expect(args.amountUsd).toBe(750)
    expect(args.intentId).toBe("intent-1")
  })
})

describe("lendResultToRecordArgs (token→USD reconciliation)", () => {
  // Regression for the critical bug where token-denominated lend amounts were sent as
  // USD, tripping the server's USD supplied-balance reconciliation for every non-$1 asset.
  function ethDepositResult(tokenAmount: number, suppliedValueUsd: number): LendSandboxActionResult {
    return {
      historyItem: {
        id: "h", intentId: "lend-intent-1", walletId: "0xabc", marketId: "eth",
        positionId: "pos-1", kind: "deposit", status: "success", asset: "ETH",
        amount: tokenAmount, simulated: true, timestamp: 1, hash: "0xsim",
      },
      state: {
        now: 1,
        markets: { eth: { marketId: "eth", assetPriceUsd: 3500 } as never },
        positions: { "pos-1": { suppliedValueUsd, interestEarned: 0 } as never },
        walletBalances: {},
        transactions: [],
      } as never,
    } as LendSandboxActionResult
  }

  it("converts a non-$1 token deposit (2 ETH @ $3500) to USD for the amount and ledger delta", () => {
    const args = lendResultToRecordArgs(ethDepositResult(2, 7000), "0xWALLET")
    expect(args.amountUsd).toBe(7000)
    expect(args.requestedAmountUsd6).toBe("7000000000")
    expect(args.executedAmountUsd6).toBe("7000000000")
    expect(args.position?.suppliedUsd6).toBe("7000000000")
    expect(args.ledger?.suppliedDeltaUsd).toBe(7000)
  })

  it("uses a negative USD delta for a withdraw", () => {
    const result = ethDepositResult(1, 3500)
    result.historyItem.kind = "withdraw"
    const args = lendResultToRecordArgs(result, "0xWALLET")
    expect(args.amountUsd).toBe(3500)
    expect(args.ledger?.suppliedDeltaUsd).toBe(-3500)
  })
})

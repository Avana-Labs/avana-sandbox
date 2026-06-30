import { describe, expect, it } from "vitest"
import type { TransactionHistoryItem } from "@/app/lib/borrow-system/contracts"
import { borrowHistoryItemToRecordArgs } from "../persistence"

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

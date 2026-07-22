import { describe, expect, it } from "vitest"
import { swapTransactionToReceiptData } from "@/app/sandbox/transactions/[hash]/synthetic-transaction-client"
import type { SwapTransactionRecord } from "@/app/lib/swap-system"

describe("swapTransactionToReceiptData", () => {
  it("maps canonical swap metadata to the shared receipt", () => {
    const transaction: SwapTransactionRecord = {
      id: "swap-1",
      walletId: "wallet-1",
      inputAssetId: "eth",
      outputAssetId: "usdc",
      inputAmount: 0.001,
      outputAmount: 1.925,
      minimumOutputAmount: 1.915,
      quoteId: "quote-1",
      provider: "Avana mock router",
      exchangeRate: 1925,
      priceImpactPct: 0.08,
      slippageBps: 50,
      networkFeeUsd: 0.24,
      route: ["ETH", "USDC"],
      swapTransactionHash: "0xswap123",
      status: "confirmed",
      createdAt: 1_700_000_000_000,
      confirmedAt: 1_700_000_001_000,
    }

    expect(swapTransactionToReceiptData(transaction)).toMatchObject({
      title: "Swap ETH for USDC",
      amountRowLabel: "Sold",
      amountLabel: "0.001 ETH",
      rateLabel: "Received",
      rateValue: "1.925 USDC",
      hash: "0xswap123",
      quoteId: "quote-1",
    })
  })
})

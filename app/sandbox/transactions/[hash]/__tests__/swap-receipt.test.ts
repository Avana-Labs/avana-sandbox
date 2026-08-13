import { describe, expect, it } from "vitest"
import {
  swapTransactionToReceiptData,
  toReceiptData,
} from "@/app/sandbox/transactions/[hash]/synthetic-transaction-client"
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

describe("toReceiptData — durable swap row (cross-device / no in-session history)", () => {
  const swapRow = {
    at: 1_700_000_001_000,
    syntheticTxHash: "0xswap123",
    amountUsd: 3.21,
    product: "swap",
    kind: "swap",
    status: "success",
    swapInputSymbol: "ETH",
    swapOutputSymbol: "USDC",
    swapInputAmount: 0.001,
    swapOutputAmount: 1.925,
    swapProvider: "Avana mock router",
    swapQuoteId: "quote-1",
    swapNetworkFeeUsd: 0.24,
    swapMinOutputAmount: 1.915,
    swapPriceImpactPct: 0.08,
    swapSlippageBps: 50,
  }

  it("renders the full swap breakdown from the persisted row alone", () => {
    const data = toReceiptData(swapRow)
    expect(data).toMatchObject({
      title: "Swap ETH for USDC",
      amountRowLabel: "Sold",
      amountLabel: "0.001 ETH",
      rateLabel: "Received",
      rateValue: "1.925 USDC",
      marketValue: "Avana mock router",
      networkFeeUsd: 0.24,
      hash: "0xswap123",
      quoteId: "quote-1",
    })
    expect(data.metrics).toEqual([
      { id: "minimum-received", label: "Minimum received", value: "1.915 USDC" },
      { id: "price-impact", label: "Price impact", value: "0.08%" },
      { id: "slippage", label: "Max slippage", value: "0.50%" },
    ])
  })

  it("uses the failure summary and omits economics for a failed swap row", () => {
    const data = toReceiptData({
      at: 1_700_000_001_000,
      syntheticTxHash: "0xfail",
      amountUsd: 0,
      product: "swap",
      kind: "swap",
      status: "failed",
      swapInputSymbol: "ETH",
      swapOutputSymbol: "USDC",
      swapInputAmount: 0.001,
      swapOutputAmount: 0,
    })
    expect(data.description).toBe("Swap did not complete.")
    // A durable row seeded before this change (or a failed swap) carries no economics.
    expect(data.metrics).toBeUndefined()
    // Falls back to a hash-derived network fee when none was persisted.
    expect(data.networkFeeUsd).toBeGreaterThan(0)
  })
})

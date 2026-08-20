import { describe, expect, it } from "vitest"
import { askAIToolNames, parseAskAIToolArgs } from "../tool-contracts"

describe("Ask AI tool contracts", () => {
  it("exposes only approved read-only tools", () => {
    expect(askAIToolNames).toEqual([
      "read_portfolio",
      "read_borrow_capacity",
      "read_position_risk",
      "simulate_borrow",
      "run_collateral_stress",
      "search_markets",
      "search_pool_metrics",
      "search_avana_knowledge",
    ])
    expect(askAIToolNames).not.toContain("send_transaction")
  })

  it("normalizes safe simulation arguments without accepting a wallet", () => {
    expect(
      parseAskAIToolArgs("simulate_borrow", {
        positionId: "position-1",
        additionalBorrowAmount: 1_000,
        borrowAsset: "usdc",
      }),
    ).toEqual({ positionId: "position-1", additionalBorrowAmount: 1_000, borrowAsset: "USDC" })
    expect(() =>
      parseAskAIToolArgs("simulate_borrow", {
        positionId: "position-1",
        additionalBorrowAmount: 1_000,
        borrowAsset: "USDC",
        walletAddress: "0xother",
      }),
    ).toThrow()
  })

  it("bounds financial and stress arguments", () => {
    expect(() =>
      parseAskAIToolArgs("simulate_borrow", { positionId: "p", additionalBorrowAmount: 0, borrowAsset: "USDC" }),
    ).toThrow()
    expect(() =>
      parseAskAIToolArgs("run_collateral_stress", { positionId: "p", assetPriceChanges: { ETH: -1 } }),
    ).toThrow()
  })
})

import { describe, expect, it } from "vitest"
import { calculateCreditMetrics, formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { applyBorrowAction } from "@/app/lib/credit-engine/actions"
import {
  EXAMPLE_CURVE_MARKET_ID,
  EXAMPLE_CURVE_USDT_ASSET_ID,
  EXAMPLE_UNI_MARKET_ID,
  EXAMPLE_UNI_USDC_ASSET_ID,
  EXAMPLE_WALLET_1_DEBT_ID,
  makeExampleBorrowSystemState,
} from "./fixtures"

describe("borrow debt actions", () => {
  it("adds debt and reduces liquidity on borrow", () => {
    const state = makeExampleBorrowSystemState()
    const next = applyBorrowAction(state, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("1200", 6),
    })

    expect(formatFixed(next.assets[EXAMPLE_UNI_USDC_ASSET_ID]!.snapshot.availableLiquidityUsd6, 6)).toBe("124998800")
    expect(formatFixed(next.assets[EXAMPLE_UNI_USDC_ASSET_ID]!.snapshot.totalBorrowedUsd6, 6)).toBe("54001200")
    expect(formatFixed(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6, 6)).toBe("7400")
    expect(next.transactions.at(-1)?.kind).toBe("borrow")
  })

  it("burns debt and restores liquidity on repay", () => {
    const state = makeExampleBorrowSystemState()
    const next = applyBorrowAction(state, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("1000", 6),
    })

    expect(formatFixed(next.assets[EXAMPLE_UNI_USDC_ASSET_ID]!.snapshot.availableLiquidityUsd6, 6)).toBe("125001000")
    expect(formatFixed(next.assets[EXAMPLE_UNI_USDC_ASSET_ID]!.snapshot.totalBorrowedUsd6, 6)).toBe("53999000")
    expect(formatFixed(calculateCreditMetrics(next, "wallet-1").totalBorrowedUsd6, 6)).toBe("5200")
    expect(next.transactions.at(-1)?.kind).toBe("repay")
  })

  it("rejects a borrow when the wallet has no collateral in the target spoke", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.collateralPositions = state.accounts["wallet-1"]!.collateralPositions.filter(
      (position) => position.marketId !== EXAMPLE_CURVE_MARKET_ID,
    )

    expect(() =>
      applyBorrowAction(state, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_CURVE_MARKET_ID,
        assetId: EXAMPLE_CURVE_USDT_ASSET_ID,
        amountUsd6: parseFixed("300", 6),
      }),
    ).toThrow("Wallet wallet-1 has no collateral in spoke curve-crypto")
  })

  it("rejects a borrow when the target spoke is out of borrowing power even if wallet-wide credit remains", () => {
    const state = makeExampleBorrowSystemState()
    const uniPosition = state.accounts["wallet-1"]!.collateralPositions.find(
      (position) => position.marketId === EXAMPLE_UNI_MARKET_ID,
    )!
    uniPosition.collateralShares = parseFixed("4", 18)
    uniPosition.principalTokenAmount = parseFixed("4", 18)

    expect(calculateCreditMetrics(state, "wallet-1").availableCreditUsd6).toBeGreaterThan(0n)
    expect(() =>
      applyBorrowAction(state, {
        type: "borrow",
        walletId: "wallet-1",
        marketId: EXAMPLE_UNI_MARKET_ID,
        assetId: EXAMPLE_UNI_USDC_ASSET_ID,
        amountUsd6: parseFixed("300", 6),
      }),
    ).toThrow("Wallet wallet-1 does not have enough available credit in spoke uni-v3-bluechip")
  })
})

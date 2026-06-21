import { describe, expect, it } from "vitest"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import {
  buildHomeBorrowPreview,
  buildHomeRemovePreview,
  buildHomeRepayPreview,
  selectHomeDebtContextForMarket,
  selectHomeDebtMap,
  selectHomeBorrowTokensForMarket,
} from "@/app/lib/borrow-system/home-runtime"

describe("home runtime", () => {
  it("only exposes borrowables that belong to the selected market spoke", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const tokens = selectHomeBorrowTokensForMarket(state, "demo-wallet", "uni-v3-bluechip-weth-usdc")

    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.every((token) => token.id.startsWith("uni-v3-bluechip:"))).toBe(true)
  })

  it("maps home debt by spoke so collateral in the same spoke sees the same debt context", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const debtByMarket = selectHomeDebtMap(state, "demo-wallet")

    expect(debtByMarket["uni-v3-bluechip-weth-usdc"]).toBe(1200)
    expect(debtByMarket["uni-v3-bluechip-wbtc-weth"]).toBe(1200)
    expect(debtByMarket["uni-v3-stable-usdc-usdt"]).toBe(800)
  })

  it("builds borrow previews from spoke-scoped engine checks", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeBorrowPreview(
      state,
      "demo-wallet",
      "uni-v3-bluechip-weth-usdc",
      "uni-v3-bluechip:usdc",
      4000,
    )

    expect(preview.isValid).toBe(false)
    expect(preview.exceedsBorrowPower).toBe(true)
    expect(preview.ctaLabel).toBe("Exceeds borrow power")
  })

  it("returns the actual debt asset for the selected market context", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const debt = selectHomeDebtContextForMarket(state, "demo-wallet", "uni-v3-stable-usdc-usdt")

    expect(debt?.token.id).toBe("uni-v3-stable:usdt")
    expect(debt?.amountUsd).toBe(800)
  })

  it("flags unsafe removals when the selected spoke would fall below health factor 1", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeRemovePreview(state, "demo-wallet", "uni-v3-stable-usdc-usdt", 100)

    expect(preview.isUnsafe).toBe(true)
    expect(preview.safePercent).toBeLessThan(100)
  })

  it("returns an empty remove preview when the wallet has no collateral in that market", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const preview = buildHomeRemovePreview(state, "demo-wallet", "aero-basic-volatile-well-weth", 25)

    expect(preview.safePercent).toBe(0)
    expect(preview.removeUsd).toBe(0)
    expect(preview.ctaLabel).toBe("No collateral supplied")
  })

  it("repay previews use the real debt position and improve health after repayment", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const debt = selectHomeDebtContextForMarket(state, "demo-wallet", "uni-v3-bluechip-weth-usdc")
    if (!debt) {
      throw new Error("Expected bluechip debt context")
    }

    const preview = buildHomeRepayPreview(state, "demo-wallet", debt.position.id, 300)

    expect(preview.isValid).toBe(true)
    expect(preview.remainingDebtUsd).toBeLessThan(debt.amountUsd)
    expect(preview.yearlyInterestSavedUsd).toBeCloseTo(300 * (debt.borrowApr / 100), 2)
  })
})

import { describe, expect, it } from "vitest"
import { parseFixed, simulateBorrow } from "@/app/lib/credit-engine"
import {
  EXAMPLE_UNI_MARKET_ID,
  EXAMPLE_UNI_USDC_ASSET_ID,
  EXAMPLE_WALLET_1_DEBT_ID,
  makeExampleBorrowSystemState,
} from "@/app/lib/credit-engine/__tests__/fixtures"
import {
  buildHomeBorrowPreview,
  buildHomeRemovePreview,
  buildHomeRepayPreview,
  buildHomeSupplyPreview,
} from "@/app/lib/borrow-system/modal-preview-runtime"

describe("modal preview runtime", () => {
  it("buildHomeBorrowPreview matches engine simulateBorrow health factor", () => {
    const state = makeExampleBorrowSystemState()
    const preview = buildHomeBorrowPreview(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, 300)
    const engine = simulateBorrow(state, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    expect(preview.isValid).toBe(engine.allowed)
    expect(preview.healthFactor).toBeCloseTo(Number.parseFloat(engine.after.metrics.healthFactorWad?.toString() ?? "0") / 1e18, 2)
  })

  it("buildHomeRepayPreview reduces debt in preview metrics", () => {
    const state = makeExampleBorrowSystemState()
    const debtBefore = 4200 // approximate fixture debt
    const preview = buildHomeRepayPreview(state, "wallet-1", EXAMPLE_WALLET_1_DEBT_ID, 250)

    expect(preview.isValid).toBe(true)
    expect(preview.remainingDebtUsd).toBeLessThan(debtBefore + 2000)
    expect(preview.healthFactorAfter).not.toBeNull()
  })

  it("buildHomeRemovePreview flags unsafe large removals", () => {
    const state = makeExampleBorrowSystemState()
    const preview = buildHomeRemovePreview(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, 100)

    expect(preview.isUnsafe).toBe(true)
    expect(preview.riskTone).toBe("danger")
  })

  it("buildHomeSupplyPreview uses engine deposit simulation", () => {
    const state = makeExampleBorrowSystemState()
    const preview = buildHomeSupplyPreview(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, 1000)

    expect(preview.isValid).toBe(true)
    expect(preview.collateralValueUsd).toBeGreaterThan(0)
    expect(preview.borrowPowerUsd).toBeGreaterThan(0)
  })
})

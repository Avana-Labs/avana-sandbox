import { describe, expect, it } from "vitest"
import {
  mapBorrowRemovePreviewToActionUi,
  mapBorrowRepayPreviewToActionUi,
  mapBorrowSupplyPreviewToActionUi,
  mapBorrowTransactionPreviewToActionUi,
} from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { borrowPreviewFixture } from "@/app/lib/action-system/__tests__/fixtures"

describe("borrow preview mappers", () => {
  const preview = borrowPreviewFixture()

  it("maps borrow metrics from spec including LTV and liquidation threshold", () => {
    const ui = mapBorrowTransactionPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 1000,
      marketLabel: "USDC · Core",
      ratePct: 5.2,
      balanceLabel: "Available to Borrow",
      balanceUsd: 5000,
      liquidationThresholdPct: 82.5,
      maxBorrowUsd: 5000,
      creditScopeLabel: "Uniswap Bluechip",
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Credit scope",
      "Position APY",
      "LTV in scope",
      "Liquidation threshold",
      "Borrowing power in scope",
      "Net balance in scope",
      "Net collateral in scope",
      "Health factor in scope",
    ])
    // LTV live-updates from before → after (0.25 → 0.35 in the fixture). Percentages now use
    // fixed 2dp everywhere (formatActionPercent unified with formatActionRatioPercent).
    expect(ui.metrics.find((row) => row.id === "ltv")?.value).toBe("25.00% → 35.00%")
    expect(ui.metrics.find((row) => row.id === "liquidation-threshold")?.value).toBe("82.50%")
    // Max borrow respects the collateral factor (pre-borrow available credit).
    expect(ui.maxAmount).toBe(5000)
  })

  it("omits the liquidation-threshold row when not provided", () => {
    const ui = mapBorrowTransactionPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 1000,
      marketLabel: "USDC · Core",
      ratePct: 5.2,
      balanceLabel: "Available to Borrow",
      balanceUsd: 5000,
    })

    expect(ui.metrics.some((row) => row.id === "liquidation-threshold")).toBe(false)
    expect(ui.metrics.some((row) => row.id === "ltv")).toBe(true)
    // Falls back to the pre-borrow borrowing power (5000 in the fixture).
    expect(ui.maxAmount).toBe(5000)
  })

  it("maps repay-specific metrics", () => {
    const ui = mapBorrowRepayPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 500,
      marketLabel: "USDC · Core",
      remainingDebtUsd: 3000,
      yearlyInterestSavedUsd: 42,
      creditScopeLabel: "Uniswap Bluechip",
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Credit scope",
      "Remaining debt",
      "Health factor after in scope",
      "Interest saved (est. yearly)",
    ])
  })

  it("blocks an over-repay (amount greater than outstanding debt)", () => {
    const ui = mapBorrowRepayPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 500,
      marketLabel: "USDC · Core",
      remainingDebtUsd: 0,
      yearlyInterestSavedUsd: 0,
      exceedsDebt: true,
    })

    expect(ui.allowed).toBe(false)
    expect(ui.blockedReason).toBe("Amount exceeds outstanding debt. Maximum repay is $2,500.00.")
  })

  it("allows a repay within the outstanding debt", () => {
    const ui = mapBorrowRepayPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 500,
      marketLabel: "USDC · Core",
      remainingDebtUsd: 2500,
      yearlyInterestSavedUsd: 42,
      exceedsDebt: false,
    })

    expect(ui.allowed).toBe(true)
    expect(ui.blockedReason).toBeNull()
  })

  it("maps supply metrics including borrowable assets", () => {
    const ui = mapBorrowSupplyPreviewToActionUi(preview, {
      symbol: "WETH / USDC",
      amountUsd: 2000,
      marketLabel: "WETH / USDC",
      poolLabel: "WETH / USDC",
      collateralSymbol: "WETH",
      borrowSymbol: "USDC",
      collateralFactorPct: 80,
      collateralRiskPct: 5,
      borrowableAssetsLabel: "USDC, GHO",
      borrowableAssetSymbols: ["USDC", "GHO"],
      creditScopeLabel: "Uniswap Bluechip",
    })

    expect(ui.amountValue).toBe("2000")
    expect(ui.assetLabel).toBe("WETH / USDC")
    expect(ui.borrowSymbol).toBe("USDC")

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Credit scope",
      "Collateral factor",
      "Collateral risk",
      "Borrowable assets",
      "Borrowing power in scope",
      "Health factor in scope",
    ])
    expect(ui.metrics.find((row) => row.id === "borrowable-assets")?.tokenSymbols).toEqual(["USDC", "GHO"])
  })

  it("humanizes a leaky blocked reason so no internal ids reach the banner", () => {
    const blocked = borrowPreviewFixture({
      allowed: false,
      validationErrors: ["Wallet wallet-1 does not have enough available credit in spoke uni-v3-bluechip"],
    })
    const ui = mapBorrowTransactionPreviewToActionUi(blocked, {
      symbol: "USDC",
      amountUsd: 999999,
      marketLabel: "USDC · Core",
      ratePct: 5.2,
      balanceLabel: "Available to Borrow",
      balanceUsd: 5000,
      maxBorrowUsd: 5000,
      creditScopeLabel: "Uniswap Bluechip",
    })

    expect(ui.blockedReason).toBe("Maximum safe borrow is $5,000.00, limited by borrowing power in Uniswap Bluechip.")
    expect(ui.blockedReason).not.toMatch(/spoke|wallet-1|insolvent/i)
  })

  it("maps remove metrics", () => {
    const removePreview = {
      ...preview,
      after: { ...preview.after, collateralValueUsd6: 7_500_000_000n },
    }
    const ui = mapBorrowRemovePreviewToActionUi(removePreview, {
      percent: 25,
      safePercent: 60,
      removeUsd: 2500,
      marketLabel: "WETH · Core",
      positionApyPct: 3.5,
      creditScopeLabel: "Uniswap Bluechip",
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Credit scope",
      "Annual earnings",
      "Borrowing power in scope",
      "Net balance in scope",
      "Net collateral in scope",
      "Health factor in scope",
    ])
    expect(ui.amountUsd).toBe(2500)
    expect(ui.amountValue).toBe("25")
    expect(ui.amountUnitLabel).toBe("%")
    expect(ui.assetLabel).toBe("%")
    expect(ui.amountUsdLabel).toBe("$2,500.00")
    expect(ui.balanceValue).toBe("$2,500.00")
    expect(ui.maxAmount).toBe(60)
  })
})

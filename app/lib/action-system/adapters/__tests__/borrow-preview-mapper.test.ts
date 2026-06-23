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

  it("maps borrow metrics from spec", () => {
    const ui = mapBorrowTransactionPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 1000,
      marketLabel: "USDC · Core",
      ratePct: 5.2,
      balanceLabel: "Available to Borrow",
      balanceUsd: 5000,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Position APY",
      "Borrowing power",
      "Net balance",
      "Net collateral",
      "Health factor",
    ])
  })

  it("maps repay-specific metrics", () => {
    const ui = mapBorrowRepayPreviewToActionUi(preview, {
      symbol: "USDC",
      amountUsd: 500,
      marketLabel: "USDC · Core",
      remainingDebtUsd: 3000,
      yearlyInterestSavedUsd: 42,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Remaining debt",
      "Health factor after",
      "Interest saved (est. yearly)",
    ])
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
    })

    expect(ui.amountValue).toBe("2000")
    expect(ui.assetLabel).toBe("WETH / USDC")
    expect(ui.borrowSymbol).toBe("USDC")

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Collateral factor",
      "Collateral risk",
      "Borrowable assets",
      "Borrowing power",
      "Health factor",
    ])
    expect(ui.metrics.find((row) => row.id === "borrowable-assets")?.tokenSymbols).toEqual(["USDC", "GHO"])
  })

  it("maps remove metrics", () => {
    const ui = mapBorrowRemovePreviewToActionUi(preview, {
      percent: 25,
      safePercent: 60,
      removeUsd: 2500,
      marketLabel: "WETH · Core",
      positionApyPct: 3.5,
    })

    expect(ui.metrics.map((row) => row.label)).toEqual([
      "Position APY",
      "Annual earnings",
      "Borrowing power",
      "Net balance",
      "Net collateral",
      "Health factor",
    ])
    expect(ui.maxAmount).toBe(60)
  })
})

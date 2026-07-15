import { describe, expect, it } from "vitest"
import {
  formatFixed,
  parseFixed,
  simulateBorrow,
  simulateDeposit,
  simulateLiquidation,
  simulateRepay,
  simulateWithdraw,
} from "@/app/lib/credit-engine"
import {
  buildBorrowPreviewModel,
  buildDepositPreviewModel,
  buildLiquidationPreviewModel,
  buildRepayPreviewModel,
  buildWithdrawPreviewModel,
} from "@/app/lib/borrow-system/preview-builders"
import {
  EXAMPLE_UNI_MARKET_ID,
  EXAMPLE_UNI_USDC_ASSET_ID,
  EXAMPLE_WALLET_1_DEBT_ID,
  makeExampleBorrowSystemState,
} from "@/app/lib/credit-engine/__tests__/fixtures"

describe("borrow preview builders", () => {
  it("matches engine borrow simulations", () => {
    const state = makeExampleBorrowSystemState()
    const model = buildBorrowPreviewModel(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, EXAMPLE_UNI_USDC_ASSET_ID, 300)
    const simulation = simulateBorrow(state, {
      type: "borrow",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      assetId: EXAMPLE_UNI_USDC_ASSET_ID,
      amountUsd6: parseFixed("300", 6),
    })

    expect(model.isValid).toBe(simulation.allowed)
    expect(model.remainingBorrowPowerUsd).toBe(
      Number.parseFloat(formatFixed(simulation.after.metrics.availableBorrowCapacityUsd6, 6)),
    )
  })

  it("matches engine repay simulations", () => {
    const state = makeExampleBorrowSystemState()
    const model = buildRepayPreviewModel(state, "wallet-1", EXAMPLE_WALLET_1_DEBT_ID, 300)
    const simulation = simulateRepay(state, {
      type: "repay",
      walletId: "wallet-1",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      amountUsd6: parseFixed("300", 6),
    })

    expect(model.isValid).toBe(simulation.allowed)
    expect(model.remainingDebtUsd).toBe(Number.parseFloat(formatFixed(simulation.after.metrics.totalBorrowedUsd6, 6)))
    expect(model.yearlyInterestSavedUsd).toBeCloseTo(300 * 0.052, 2)
  })

  it("matches engine deposit borrow-power delta", () => {
    const state = makeExampleBorrowSystemState()
    const model = buildDepositPreviewModel(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, 1000)
    const simulation = simulateDeposit(state, {
      type: "supplyCollateral",
      walletId: "wallet-1",
      marketId: EXAMPLE_UNI_MARKET_ID,
      amountUsd6: parseFixed("1000", 6),
    })

    expect(model.isValid).toBe(simulation.allowed)
    expect(model.borrowPowerDeltaUsd).toBeCloseTo(
      Number.parseFloat(
        formatFixed(
          simulation.after.metrics.availableBorrowCapacityUsd6 - simulation.before.metrics.availableBorrowCapacityUsd6,
          6,
        ),
      ),
      2,
    )
  })

  it("matches engine withdraw simulations", () => {
    const state = makeExampleBorrowSystemState()
    const model = buildWithdrawPreviewModel(state, "wallet-1", EXAMPLE_UNI_MARKET_ID, 10)
    const simulation = simulateWithdraw(state, {
      type: "removeCollateral",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      percentBps: 1000,
    })

    expect(model.isUnsafe).toBe(!simulation.allowed)
    expect(model.healthFactorAfter).toBe(
      simulation.after.metrics.healthFactorWad == null
        ? null
        : Number.parseFloat(formatFixed(simulation.after.metrics.healthFactorWad, 18)),
    )
  })

  it("matches engine liquidation simulations without mutating source state", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = parseFixed("18000", 6)
    state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = parseFixed("18000", 6)
    const beforeDebt = state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6

    const model = buildLiquidationPreviewModel(state, "wallet-1", "wallet-1:weth-usdc", EXAMPLE_WALLET_1_DEBT_ID, 2000)
    const simulation = simulateLiquidation(state, {
      type: "liquidate",
      walletId: "wallet-1",
      positionId: "wallet-1:weth-usdc",
      debtPositionId: EXAMPLE_WALLET_1_DEBT_ID,
      repayAmountUsd6: parseFixed("2000", 6),
    })

    expect(model.allowed).toBe(simulation.allowed)
    expect(model.riskLabel).toBe(simulation.riskLabel)
    expect(state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6).toBe(beforeDebt)
  })
})

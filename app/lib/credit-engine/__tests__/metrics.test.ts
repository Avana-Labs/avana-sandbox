import { describe, expect, it } from "vitest"
import { WAD_DECIMALS, formatFixed, parseFixed } from "@/app/lib/credit-engine"
import {
  calculateBorrowCapacityUsd6,
  calculateCreditMetrics,
  calculateCurrentLtvWad,
  calculateHealthFactorWad,
  calculateSpokeCreditMetrics,
} from "@/app/lib/credit-engine/metrics"
import { EXAMPLE_UNI_MARKET_ID, makeExampleBorrowSystemState } from "./fixtures"

describe("credit metrics", () => {
  it("matches the example borrow account formulas", () => {
    const state = makeExampleBorrowSystemState()
    const metrics = calculateCreditMetrics(state, "wallet-1")
    expect(formatFixed(metrics.poolCollateralValueUsd6, 6)).toBe("20399.225")
    expect(formatFixed(metrics.creditLimitUsd6, 6)).toBe("14480.3956")
    expect(formatFixed(metrics.availableCreditUsd6, 6)).toBe("8280.3956")
    expect(formatFixed(metrics.totalBorrowedUsd6, 6)).toBe("6200")
    expect(formatFixed(metrics.liquidationValueUsd6, 6)).toBe("16520.3181")
    expect(formatFixed(metrics.liquidationBufferUsd6, 6)).toBe("10320.3181")
    expect(formatFixed(metrics.netAccountValueUsd6, 6)).toBe("26699.225")
    expect(formatFixed(metrics.healthFactorWad, WAD_DECIMALS)).toBe("2.664567435483870967")
    expect(formatFixed(metrics.weightedCollateralRiskWad, WAD_DECIMALS)).toBe("0.24283686757707707")
    expect(formatFixed(metrics.riskPremiumWad, WAD_DECIMALS)).toBe("0.022558427640694814")
    expect(formatFixed(metrics.borrowAprWad, WAD_DECIMALS)).toBe("0.074558427640694814")
    expect(formatFixed(metrics.netApyWad, WAD_DECIMALS)).toBe("0.112458389672359403")
    expect(formatFixed(metrics.annualYieldEarnedUsd6, 6)).toBe("3464.8141")
    expect(formatFixed(metrics.annualBorrowCostUsd6, 6)).toBe("462.262251")
  })

  it("clamps available credit at zero", () => {
    const state = makeExampleBorrowSystemState()
    const debt = state.accounts["wallet-1"]!.debtPositions[0]!
    debt.principalBorrowedUsd6 = debt.principalBorrowedUsd6 * 4n
    debt.debtSharesUsd6 = debt.debtSharesUsd6 * 4n

    const metrics = calculateCreditMetrics(state, "wallet-1")
    expect(metrics.availableCreditUsd6).toBe(0n)
  })

  it("keeps wallet aggregates separate from spoke insolvency", () => {
    const state = makeExampleBorrowSystemState()
    const uniPosition = state.accounts["wallet-1"]!.collateralPositions.find(
      (position) => position.marketId === EXAMPLE_UNI_MARKET_ID,
    )!
    uniPosition.collateralShares = parseFixed("4", 18)
    uniPosition.principalTokenAmount = parseFixed("4", 18)

    const walletMetrics = calculateCreditMetrics(state, "wallet-1")
    const spokeMetrics = calculateSpokeCreditMetrics(state, "wallet-1", "uni-v3-bluechip")

    expect(walletMetrics.availableCreditUsd6).toBeGreaterThan(0n)
    expect(spokeMetrics.availableCreditUsd6).toBe(0n)
    expect(spokeMetrics.healthFactorWad).toBeLessThan(parseFixed("1", 18))
  })

  it("calculates borrow capacity from collateral factors across enabled collateral positions", () => {
    const state = makeExampleBorrowSystemState()

    expect(formatFixed(calculateBorrowCapacityUsd6(state, "wallet-1"), 6)).toBe("14480.3956")
  })

  it("never returns borrow capacity above the sum allowed by collateral factors", () => {
    const state = makeExampleBorrowSystemState()
    state.markets["uni-v3-bluechip-weth-usdc"]!.riskConfig.collateralFactorWad = parseFixed("1.25", 18)

    expect(formatFixed(calculateBorrowCapacityUsd6(state, "wallet-1"), 6)).toBe("20399.225")
  })

  it("returns zero borrow capacity when all collateral is invalid or disabled", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.collateralPositions = state.accounts["wallet-1"]!.collateralPositions.map((position) => ({
      ...position,
      collateralEnabled: false,
    }))

    expect(calculateBorrowCapacityUsd6(state, "wallet-1")).toBe(0n)
  })

  it("calculates current ltv from outstanding debt and collateral value", () => {
    const state = makeExampleBorrowSystemState()

    expect(formatFixed(calculateCurrentLtvWad(state, "wallet-1"), WAD_DECIMALS)).toBe("0.303933115106088589")
  })

  it("returns zero ltv when there is no debt", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.debtPositions = []

    expect(calculateCurrentLtvWad(state, "wallet-1")).toBe(0n)
  })

  it("handles zero collateral safely when calculating ltv", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.collateralPositions = []

    expect(calculateCurrentLtvWad(state, "wallet-1")).toBe(0n)
  })

  it("returns a safe health factor when there is no debt", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.debtPositions = []

    expect(calculateHealthFactorWad(state, "wallet-1")).toBeNull()
  })

  it("lowers health factor as debt increases", () => {
    const state = makeExampleBorrowSystemState()
    const debt = state.accounts["wallet-1"]!.debtPositions[0]!
    const before = calculateHealthFactorWad(state, "wallet-1")

    debt.principalBorrowedUsd6 += parseFixed("1000", 6)
    debt.debtSharesUsd6 += parseFixed("1000", 6)

    const after = calculateHealthFactorWad(state, "wallet-1")
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after!).toBeLessThan(before!)
  })

  it("lowers health factor as collateral value drops and flags unhealthy positions", () => {
    const state = makeExampleBorrowSystemState()
    const account = state.accounts["wallet-1"]!

    const before = calculateHealthFactorWad(state, "wallet-1")
    account.collateralPositions = []

    const after = calculateHealthFactorWad(state, "wallet-1")

    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(after!).toBeLessThan(before!)
    expect(after!).toBeLessThan(parseFixed("1", 18))
  })
})

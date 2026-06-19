import { describe, expect, it } from "vitest"
import { WAD_DECIMALS, formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { calculateCreditMetrics, calculateSpokeCreditMetrics } from "@/app/lib/credit-engine/metrics"
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
})

import { describe, expect, it } from "vitest"
import { simulateDeleverage, simulateMultiply } from "@/app/lib/multiply-engine"
import { EXAMPLE_ETH_USDT_MARKET, makeExampleMultiplySystemState } from "./fixtures"

describe("multiply engine simulation", () => {
  it("simulates multiply with validation output", () => {
    const simulation = simulateMultiply({
      market: EXAMPLE_ETH_USDT_MARKET,
      collateralAmount: 1,
      selectedMultiplier: 2,
    })

    expect(simulation.action).toBe("multiply")
    expect(simulation.after.collateralValueUsd).toBeGreaterThan(simulation.before.collateralValueUsd)
    expect(simulation.after.debtValueUsd).toBeGreaterThan(0)
    expect(simulation.validation.allowed).toBe(true)
  })

  it("simulates deleverage and improves health factor", () => {
    const state = makeExampleMultiplySystemState()
    const position = Object.values(state.positions)[0]!
    const market = state.markets[position.marketId]!

    const simulation = simulateDeleverage({
      market,
      position,
      targetMultiplier: 1.8,
    })

    expect(simulation.validation.allowed).toBe(true)
    expect(simulation.after.debtValueUsd).toBeLessThan(simulation.before.debtValueUsd)
    if (simulation.before.healthFactor !== "infinity" && simulation.after.healthFactor !== "infinity") {
      expect(simulation.after.healthFactor).toBeGreaterThanOrEqual(simulation.before.healthFactor)
    }
  })
})

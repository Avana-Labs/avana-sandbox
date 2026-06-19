import { describe, expect, it } from "vitest"
import { RAY, parseFixed } from "@/app/lib/credit-engine"
import {
  collateralInterestEarnedUsd6,
  currentCollateralValueUsd6,
  currentDebtValueUsd6,
  debtInterestOwedUsd6,
  totalCollateralValueUsd6,
  totalDebtValueUsd6,
  totalInterestEarnedUsd6,
  totalInterestOwedUsd6,
} from "@/app/lib/credit-engine/valuation"
import { makeExampleBorrowSystemState } from "./fixtures"

describe("borrow valuation helpers", () => {
  it("values collateral from shares and lp prices", () => {
    const state = makeExampleBorrowSystemState()
    const market = state.markets["uni-v3-bluechip-weth-usdc"]!
    const position = state.accounts["wallet-1"]!.collateralPositions[0]!

    expect(currentCollateralValueUsd6(position, market)).toBe(parseFixed("15223.065", 6))
  })

  it("tracks accrued collateral yield through the supply index", () => {
    const state = makeExampleBorrowSystemState()
    const market = state.markets["uni-v3-bluechip-weth-usdc"]!
    const position = state.accounts["wallet-1"]!.collateralPositions[0]!

    market.snapshot.supplyIndexRay = RAY + parseFixed("0.05", 18) * (RAY / parseFixed("1", 18))

    expect(collateralInterestEarnedUsd6(position, market)).toBe(parseFixed("761.15325", 6))
  })

  it("values debt and interest from debt shares plus debt index", () => {
    const state = makeExampleBorrowSystemState()
    const debt = state.accounts["wallet-1"]!.debtPositions[0]!

    debt.debtIndexRay = RAY + parseFixed("0.08", 18) * (RAY / parseFixed("1", 18))

    expect(currentDebtValueUsd6(debt)).toBe(parseFixed("6696", 6))
    expect(debtInterestOwedUsd6(debt)).toBe(parseFixed("496", 6))
  })

  it("aggregates per-account collateral and debt totals", () => {
    const state = makeExampleBorrowSystemState()
    const account = state.accounts["wallet-1"]!

    expect(totalCollateralValueUsd6(account, state.markets)).toBe(parseFixed("20399.225", 6))
    expect(totalDebtValueUsd6(account)).toBe(parseFixed("6200", 6))
    expect(totalInterestEarnedUsd6(account, state.markets)).toBe(0n)
    expect(totalInterestOwedUsd6(account)).toBe(0n)
  })
})

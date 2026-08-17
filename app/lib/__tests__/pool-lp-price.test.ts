import { describe, expect, it } from "vitest"
import { BORROW_POOL_CATALOG, poolLpTokenPriceUsd } from "@/app/lib/borrow-sim"

// Minimal pool shape: poolLpTokenPriceUsd only reads collateralExampleUsd + the two visual symbols.
const pool = (s0: string, s1: string, collateralExampleUsd = 250) =>
  ({ collateralExampleUsd, visuals: [{ symbol: s0 }, { symbol: s1 }] }) as unknown as Parameters<
    typeof poolLpTokenPriceUsd
  >[0]

describe("poolLpTokenPriceUsd — component-derived (Uniswap v2 fair value)", () => {
  it("prices an LP token as 2·√(P0·P1) of its canonical component prices", () => {
    // WETH 1934, USDC 1 → 2·√1934 ≈ 87.95
    expect(poolLpTokenPriceUsd(pool("WETH", "USDC"))).toBeCloseTo(2 * Math.sqrt(1934 * 1), 6)
  })

  it("is order-independent (P0·P1 is symmetric)", () => {
    expect(poolLpTokenPriceUsd(pool("WETH", "USDC"))).toBeCloseTo(poolLpTokenPriceUsd(pool("USDC", "WETH")), 9)
  })

  it("moves with the component prices (WBTC/WETH ≫ stable/stable)", () => {
    expect(poolLpTokenPriceUsd(pool("WBTC", "WETH"))).toBeCloseTo(2 * Math.sqrt(65_000 * 1934), 3)
    expect(poolLpTokenPriceUsd(pool("USDC", "USDT"))).toBeCloseTo(2, 9)
    expect(poolLpTokenPriceUsd(pool("WBTC", "WETH"))).toBeGreaterThan(poolLpTokenPriceUsd(pool("USDC", "USDT")))
  })

  it("no longer depends on the arbitrary collateralExampleUsd (same components → same price)", () => {
    expect(poolLpTokenPriceUsd(pool("WETH", "USDC", 100))).toBeCloseTo(
      poolLpTokenPriceUsd(pool("WETH", "USDC", 999_999)),
      9,
    )
  })

  it("falls back to the example heuristic when a leg is unpriced", () => {
    expect(poolLpTokenPriceUsd(pool("WETH", "NOTATOKEN", 250))).toBe(Math.max(1, 250 / 2.5))
  })

  it("resolves component prices for real catalog pools (symbols are canonical-lookup-able)", () => {
    // Guards that pool.visuals[].symbol are real token symbols, not display labels.
    const usingComponentPrice = BORROW_POOL_CATALOG.filter(
      (p) => poolLpTokenPriceUsd(p) !== Math.max(1, p.collateralExampleUsd / 2.5),
    )
    expect(usingComponentPrice.length).toBeGreaterThan(BORROW_POOL_CATALOG.length / 2)
  })
})

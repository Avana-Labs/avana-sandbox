import { describe, expect, it } from "vitest"
import { aggregateSymbolExposure } from "@/app/lib/portfolio/exposure-aggregator"
import type { SupplyRowContext } from "@/app/lib/data/borrow-position-types"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"

// Build a borrow-collateral SupplyRowContext from a REAL catalog pool so the aggregator resolves
// its true weights.
function rowForCatalogPool(name: string, collateralUsd: number): SupplyRowContext {
  const catalog = BORROW_POOL_CATALOG.find((p) => p.name === name)!
  return {
    pool: {
      id: catalog.id,
      name: catalog.name,
      venue: catalog.venue,
      category: "test",
      collateralUsd,
      maxLtv: 0.8,
      borrowPowerUsd: collateralUsd * 0.5,
      liquidationUsd: collateralUsd * 0.85,
      pairApr: 0.05,
      visuals: [
        { symbol: catalog.visuals[0].symbol, shortLabel: "", bgClassName: "", textClassName: "" },
        { symbol: catalog.visuals[1].symbol, shortLabel: "", bgClassName: "", textClassName: "" },
      ],
    },
  } as unknown as SupplyRowContext
}

describe("weight-aware exposure attribution (C10)", () => {
  it("splits an 80/20 pool 80/20, not 50/50", () => {
    const rows = aggregateSymbolExposure({ borrowCollateral: [rowForCatalogPool("80/20 WETH/AAVE", 1000)] })
    const weth = rows.find((r) => r.symbol === "WETH")
    const aave = rows.find((r) => r.symbol === "AAVE")
    expect(weth?.longUsd).toBeCloseTo(800, 6)
    expect(aave?.longUsd).toBeCloseTo(200, 6)
  })

  it("splits a 3-token stable pool into equal thirds across all three legs", () => {
    const rows = aggregateSymbolExposure({ borrowCollateral: [rowForCatalogPool("DAI / USDC / USDT", 900)] })
    for (const sym of ["DAI", "USDC", "USDT"]) {
      expect(rows.find((r) => r.symbol === sym)?.longUsd).toBeCloseTo(300, 6)
    }
  })

  it("falls back to 50/50 for a pool not in the catalog", () => {
    const row = {
      pool: {
        id: "not-a-catalog-id",
        name: "FOO/BAR",
        venue: "x",
        category: "x",
        collateralUsd: 400,
        maxLtv: 0.8,
        borrowPowerUsd: 200,
        liquidationUsd: 340,
        pairApr: 0.05,
        visuals: [
          { symbol: "FOO", shortLabel: "", bgClassName: "", textClassName: "" },
          { symbol: "BAR", shortLabel: "", bgClassName: "", textClassName: "" },
        ],
      },
    } as unknown as SupplyRowContext
    const rows = aggregateSymbolExposure({ borrowCollateral: [row] })
    expect(rows.find((r) => r.symbol === "FOO")?.longUsd).toBe(200)
    expect(rows.find((r) => r.symbol === "BAR")?.longUsd).toBe(200)
  })
})

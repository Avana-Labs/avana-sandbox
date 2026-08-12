import { describe, expect, it } from "vitest"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import { resolveBorrowablesForPool, resolveCollateralForAsset } from "../cross-market"

describe("cross-market reference lists", () => {
  it("resolves spoke-matched borrowables for every collateral market", () => {
    for (const pool of BORROW_POOL_CATALOG) {
      const assets = resolveBorrowablesForPool(pool)
      expect(assets.length).toBeGreaterThan(0)
      expect(assets.every((asset) => asset.href.includes("/borrow/assets/"))).toBe(true)
      expect(assets.every((asset) => asset.apy > 0)).toBe(true)
      // Same spoke only — Uni v2 LPs never list Curve/Balancer borrowables.
      const spokeAssets = listSpokeBorrowables().filter((asset) => asset.spokeId === pool.spoke)
      expect(assets.map((asset) => asset.id).sort()).toEqual(spokeAssets.map((asset) => asset.id).sort())
    }
  })

  it("resolves collateral markets for every borrowable asset with that asset's LTV", () => {
    for (const asset of listSpokeBorrowables()) {
      const markets = resolveCollateralForAsset(asset)
      expect(markets.length).toBeGreaterThan(0)
      expect(markets.every((market) => asset.marketIds.includes(market.id))).toBe(true)
      expect(markets.every((market) => market.href.includes("/borrow/markets/"))).toBe(true)
      expect(markets.every((market) => market.collateralFactorPct > 0)).toBe(true)
    }
  })
})

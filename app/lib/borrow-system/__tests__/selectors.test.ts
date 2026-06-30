import { describe, expect, it } from "vitest"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import {
  selectAllAvailableCollateralPools,
  selectBorrowableAssets,
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"

describe("borrow system selectors", () => {
  it("projects canonical borrow state into borrow page rows", () => {
    const state = buildMockBorrowSystemState("demo-wallet")

    const markets = selectBorrowMarketSummaries(state, "demo-wallet")
    const allAssets = selectBorrowableAssets(state, "demo-wallet")
    const assets = selectBorrowableAssets(state, "demo-wallet", "uni-v3-bluechip-weth-usdc")
    const pools = selectBorrowCollateralPools(state, "demo-wallet")
    const debts = selectInitialBorrowDebts(state, "demo-wallet")
    const snapshot = selectWalletBorrowSnapshot(state, "demo-wallet")

    expect(markets.length).toBeGreaterThan(5)
    expect(allAssets).toHaveLength(64)
    expect(assets.length).toBeGreaterThan(1)
    expect(assets.every((asset) => asset.id.startsWith("uni-v3-bluechip:"))).toBe(true)
    expect(assets.map((asset) => asset.id)).toContain("uni-v3-bluechip:usdc")
    expect(pools).toHaveLength(3)
    expect(debts["uni-v3-bluechip-weth-usdc"]).toBe(1200)
    expect(debts["uni-v3-bluechip-wbtc-weth"]).toBeUndefined()
    expect(snapshot.totalBorrowedUsd).toBe(2000)
    expect(snapshot.availableCreditUsd).toBeGreaterThan(0)
  })

  it("exposes every market as an available collateral pool (pre-loaded picker)", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const pledged = selectBorrowCollateralPools(state, "demo-wallet")
    const available = selectAllAvailableCollateralPools(state, "demo-wallet")

    // Available is the full market catalog — strictly a superset of pledged pools.
    expect(available.length).toBe(Object.keys(state.markets).length)
    expect(available.length).toBeGreaterThan(pledged.length)
    for (const pool of pledged) {
      const match = available.find((entry) => entry.id === pool.id)
      expect(match?.collateralUsd).toBeCloseTo(pool.collateralUsd, 6)
    }
    // Unpledged pools surface with zero collateral until the user pledges.
    const unpledged = available.find((entry) => !pledged.some((p) => p.id === entry.id))
    expect(unpledged?.collateralUsd).toBe(0)
  })

  it("returns the full catalog even for a wallet with no positions", () => {
    const state = buildMockBorrowSystemState("home-demo-wallet")
    const available = selectAllAvailableCollateralPools(state, "no-such-wallet")
    expect(available.length).toBe(Object.keys(state.markets).length)
    expect(available.every((pool) => pool.collateralUsd === 0)).toBe(true)
  })
})

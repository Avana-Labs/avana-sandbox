import { describe, expect, it } from "vitest"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { calculateSpokeCreditMetrics } from "@/app/lib/credit-engine"
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

  it("surfaces a real, per-market risk premium on the borrow list (not a uniform 0.00%)", () => {
    // A browsing wallet has no positions, so the wallet-scoped premium is 0 for every spoke.
    // The list must instead show the intrinsic per-market premium from the catalog.
    const state = buildMockBorrowSystemState("browsing-wallet")
    const markets = selectBorrowMarketSummaries(state, "browsing-wallet")
    const catalogById = new Map(BORROW_POOL_CATALOG.map((row) => [row.id, row.riskPremiumBps]))

    // Not all zero.
    expect(markets.some((market) => market.riskPremiumBps > 0)).toBe(true)
    // More than one distinct value across the list — the column is genuinely informative.
    expect(new Set(markets.map((market) => market.riskPremiumBps)).size).toBeGreaterThan(1)
    // Each row matches the catalog premium the pool detail renders.
    for (const market of markets) {
      const expected = catalogById.get(market.id)
      if (expected !== undefined) expect(market.riskPremiumBps).toBe(expected)
    }
  })

  it("exposes every market as an available collateral pool (pre-loaded picker)", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const pledged = selectBorrowCollateralPools(state, "demo-wallet")
    const available = selectAllAvailableCollateralPools(state, "demo-wallet")

    // Available is the full market catalog — strictly a superset of pledged pools.
    expect(available.length).toBe(Object.keys(state.markets).length)
    expect(available.length).toBeGreaterThan(pledged.length)
  })

  it("reports spoke-scoped in-scope collateral so the card matches 'Net collateral in scope' (#86)", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const available = selectAllAvailableCollateralPools(state, "demo-wallet")

    // The reported repro: a bluechip market the wallet has NOT pledged must show
    // the spoke's in-scope collateral ($6,300), not $0.00, because the borrow is
    // allowed against the bluechip spoke's pledged collateral.
    const unpledgedBluechip = available.find((pool) => pool.id === "uni-v3-bluechip-weth-usdt")
    const spokeCollateralUsd =
      Number(calculateSpokeCreditMetrics(state, "demo-wallet", "uni-v3-bluechip").poolCollateralValueUsd6) / 1e6
    expect(spokeCollateralUsd).toBeCloseTo(6300, 4)
    expect(unpledgedBluechip?.collateralUsd).toBeCloseTo(spokeCollateralUsd, 4)
    expect(unpledgedBluechip?.collateralUsd).toBeGreaterThan(0)

    // Every pool in a spoke with collateral agrees on the in-scope value.
    for (const pool of available) {
      const spokeId = state.markets[pool.id]?.spokeId
      if (!spokeId) continue
      const inScope = Number(calculateSpokeCreditMetrics(state, "demo-wallet", spokeId).poolCollateralValueUsd6) / 1e6
      expect(pool.collateralUsd).toBeCloseTo(inScope, 4)
    }
  })

  it("returns the full catalog even for a wallet with no positions", () => {
    const state = buildMockBorrowSystemState("home-demo-wallet")
    const available = selectAllAvailableCollateralPools(state, "no-such-wallet")
    expect(available.length).toBe(Object.keys(state.markets).length)
    expect(available.every((pool) => pool.collateralUsd === 0)).toBe(true)
  })
})

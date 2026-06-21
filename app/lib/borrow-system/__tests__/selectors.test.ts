import { describe, expect, it } from "vitest"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import {
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
    expect(debts["uni-v3-bluechip-wbtc-weth"]).toBe(1200)
    expect(snapshot.totalBorrowedUsd).toBe(2000)
    expect(snapshot.availableCreditUsd).toBeGreaterThan(0)
  })
})

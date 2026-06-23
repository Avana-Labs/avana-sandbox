import { describe, expect, it } from "vitest"
import { claimSelectItemsForWallet, repaySelectItemsForWallet, resolveBorrowAssetId } from "@/app/lib/action-system/resolve-borrow-context"
import { lendWithdrawSelectItems } from "@/app/lib/action-system/resolve-lend-context"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"

describe("resolveBorrowAssetId", () => {
  it("maps short asset params to scoped engine ids", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const marketId = "uni-v3-bluechip-weth-usdc"
    expect(resolveBorrowAssetId(state, "usdc", marketId)).toBe("uni-v3-bluechip:usdc")
    expect(resolveBorrowAssetId(state, "uni-v3-bluechip:usdc", marketId)).toBe("uni-v3-bluechip:usdc")
  })

  it("keeps short asset params scoped to the selected market spoke", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const bluechipMarket = "uni-v3-bluechip-weth-usdc"
    const stableMarket = "uni-v3-stable-usdc-usdt"

    expect(resolveBorrowAssetId(state, "usdc", bluechipMarket)).toBe("uni-v3-bluechip:usdc")
    expect(resolveBorrowAssetId(state, "usdc", stableMarket)).toBe("uni-v3-stable:usdc")
  })

  it("returns empty when the asset is not borrowable in the selected market", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    expect(resolveBorrowAssetId(state, "wbtc", "uni-v3-stable-usdc-usdt")).toBe("")
  })
})

describe("claimSelectItemsForWallet", () => {
  it("shows positive claimable totals from reward positions", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const session = {
      state,
      collateralPools: [],
      getBorrowableAssetsForMarket: () => [],
      borrowableAssets: [],
    }

    const items = claimSelectItemsForWallet(session as never, "demo-wallet")
    expect(items.length).toBeGreaterThan(0)
    expect(items.some((item) => item.trailingLabel.includes("$142"))).toBe(true)
    expect(items.every((item) => !item.trailingLabel.includes("$0.00"))).toBe(true)
  })
})

describe("repaySelectItemsForWallet", () => {
  it("maps debt positions to select items", () => {
    const session = {
      state: {
        accounts: {
          "wallet-1": {
            debtPositions: [
              {
                id: "debt-1",
                assetId: "usdc",
                marketId: "market-1",
                debtSharesUsd6: 3_000_000_000n,
              },
            ],
          },
        },
        assets: {
          usdc: { id: "usdc", name: "USD Coin", symbol: "USDC" },
        },
        markets: {
          "market-1": { display: { name: "WETH / USDC" } },
        },
      },
      collateralPools: [],
      getBorrowableAssetsForMarket: () => [],
      borrowableAssets: [],
    }

    const items = repaySelectItemsForWallet(session as never, "wallet-1")
    expect(items).toHaveLength(1)
    expect(items[0]?.symbol).toBe("USDC")
    expect(items[0]?.trailingLabel).toContain("owed")
  })
})

describe("lendWithdrawSelectItems", () => {
  it("maps active lend positions", () => {
    const session = {
      state: {
        positions: {
          p1: {
            walletId: "wallet-1",
            marketId: "gho",
            status: "active",
            currentSuppliedAmount: 12.5,
          },
        },
        markets: {
          gho: { asset: { name: "GHO Stablecoin", symbol: "GHO" } },
        },
      },
    }

    const items = lendWithdrawSelectItems(session as never, "wallet-1")
    expect(items[0]?.symbol).toBe("GHO")
    expect(items[0]?.trailingSublabel).toContain("supplied")
  })
})

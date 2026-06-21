import { describe, expect, it } from "vitest"
import { repaySelectItemsForWallet } from "@/app/lib/action-system/resolve-borrow-context"
import { lendWithdrawSelectItems } from "@/app/lib/action-system/resolve-lend-context"
import { borrowPreviewFixture } from "@/app/lib/action-system/__tests__/fixtures"

describe("repaySelectItemsForWallet", () => {
  it("maps debt positions to select items", () => {
    const preview = borrowPreviewFixture()
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
    expect(items[0]?.trailingLabel).toContain("supplied")
  })
})

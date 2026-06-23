import { describe, expect, it } from "vitest"
import { supplySelectItemsForWallet } from "@/app/lib/action-system/resolve-borrow-context"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowMarketSummaries } from "@/app/lib/borrow-system/selectors"

describe("resolve borrow context", () => {
  it("only lists supply pools with wallet LP balances", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const session = {
      state,
      marketSummaries: selectBorrowMarketSummaries(state, "demo-wallet"),
      collateralPools: [],
      getBorrowableAssetsForMarket: () => [],
      borrowableAssets: [],
    }

    const items = supplySelectItemsForWallet(session, "demo-wallet")
    const ids = items.map((item) => item.id)

    expect(ids).toContain("uni-v3-bluechip-weth-usdc")
    expect(ids).toContain("uni-v3-stable-usdc-usdt")
    expect(items[0]?.pairSymbols?.length).toBe(2)
  })
})

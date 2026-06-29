import { describe, expect, it } from "vitest"
import { repaySelectItemsForWallet, supplySelectItemsForWallet } from "@/app/lib/action-system/resolve-borrow-context"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { selectBorrowMarketSummaries } from "@/app/lib/borrow-system/selectors"
import { RAY, parseFixed } from "@/app/lib/credit-engine"

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

  it("uses current debt value for repay labels", () => {
    const state = buildMockBorrowSystemState("demo-wallet")
    const debt = state.accounts["demo-wallet"]!.debtPositions[0]!
    debt.principalBorrowedUsd6 = parseFixed("1000", 6)
    debt.debtSharesUsd6 = parseFixed("1000", 6)
    debt.debtIndexRay = RAY + parseFixed("0.25", 27)

    const session = {
      state,
      marketSummaries: selectBorrowMarketSummaries(state, "demo-wallet"),
      collateralPools: [],
      getBorrowableAssetsForMarket: () => [],
      borrowableAssets: [],
    }

    const items = repaySelectItemsForWallet(session, "demo-wallet")
    expect(items[0]?.trailingLabel).toContain("$1,250")
  })
})

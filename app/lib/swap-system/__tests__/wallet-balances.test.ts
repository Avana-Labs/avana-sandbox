import { describe, expect, it } from "vitest"
import { buildDashboardWalletBalanceRows, getUserSwapBalances, type UserAssetBalance } from "@/app/lib/swap-system"

const balances: UserAssetBalance[] = [
  { id: "wallet-eth", walletId: "w1", assetId: "eth", amount: 2, sourceType: "wallet" },
  { id: "lend-usdc", walletId: "w1", assetId: "usdc", amount: 1000, sourceType: "lend_deposited" },
  { id: "wallet-lp", walletId: "w1", assetId: "eth-usdc-lp", amount: 4, sourceType: "wallet" },
  { id: "active-eth", walletId: "w1", assetId: "eth", amount: 3, sourceType: "multiply_active" },
  { id: "wallet-link", walletId: "w2", assetId: "link", amount: 9, sourceType: "wallet" },
]

describe("swap wallet balance classification", () => {
  it("scopes raw balances to the selected wallet", () => {
    expect(getUserSwapBalances("w1", balances).map((row) => row.id)).toEqual([
      "wallet-eth",
      "lend-usdc",
      "wallet-lp",
      "active-eth",
    ])
  })

  it("builds dashboard wallet rows from every product-scoped balance", () => {
    expect(buildDashboardWalletBalanceRows({ walletId: "w1", balances }).map((row) => row.id)).toEqual([
      "active-eth",
      "wallet-eth",
      "lend-usdc",
      "wallet-lp",
    ])
  })

  it("shows LP wallet balances but marks them unswappable", () => {
    const lp = buildDashboardWalletBalanceRows({ walletId: "w1", balances }).find((row) => row.id === "wallet-lp")

    expect(lp).toMatchObject({
      isLpToken: true,
      swappable: false,
      restrictionReason: "ineligible_lp_token",
    })
  })

  it("keeps regular wallet tokens swappable while product-held rows stay restricted", () => {
    const rows = buildDashboardWalletBalanceRows({ walletId: "w1", balances })
    const walletEth = rows.find((row) => row.id === "wallet-eth")
    const activeEth = rows.find((row) => row.id === "active-eth")

    expect(walletEth).toMatchObject({
      assetId: "eth",
      symbol: "ETH",
      swappable: true,
      valueUsd: 3868,
    })
    expect(activeEth).toMatchObject({
      assetId: "eth",
      symbol: "ETH",
      swappable: false,
      valueUsd: 5802,
    })
  })

  it("merges duplicate product rows and drops empty rows for dashboard display", () => {
    const rows = buildDashboardWalletBalanceRows({
      walletId: "w1",
      balances: [
        {
          id: "available-lp",
          walletId: "w1",
          assetId: "eth-usdc-lp",
          amount: 5.6,
          valueUsd: 700,
          sourceType: "borrow_collateral_unpledged",
        },
        {
          id: "zero-lp",
          walletId: "w1",
          assetId: "eth-usdc-lp",
          amount: 0,
          valueUsd: 0,
          sourceType: "borrow_collateral_unpledged",
        },
        {
          id: "more-lp",
          walletId: "w1",
          assetId: "eth-usdc-lp",
          amount: 0.8,
          valueUsd: 100,
          sourceType: "borrow_collateral_unpledged",
        },
      ],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      assetId: "eth-usdc-lp",
      valueUsd: 800,
    })
    expect(rows[0]?.amount).toBeCloseTo(6.4, 6)
  })

  it("does not merge liquid and product-scoped token rows", () => {
    const rows = buildDashboardWalletBalanceRows({
      walletId: "w1",
      balances: [
        { id: "liquid-usdc", walletId: "w1", assetId: "usdc", amount: 840, valueUsd: 840, sourceType: "wallet" },
        { id: "lend-usdc", walletId: "w1", assetId: "usdc", amount: 25, valueUsd: 25, sourceType: "lend_deposited" },
      ],
    })

    expect(rows.map((row) => row.id).sort()).toEqual(["lend-usdc", "liquid-usdc"])
  })
})

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

  it("builds dashboard wallet rows from wallet-held balances only", () => {
    expect(buildDashboardWalletBalanceRows({ walletId: "w1", balances }).map((row) => row.id)).toEqual([
      "wallet-eth",
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

  it("keeps regular wallet tokens swappable and sorted by USD value", () => {
    const rows = buildDashboardWalletBalanceRows({ walletId: "w1", balances })

    expect(rows[0]).toMatchObject({
      assetId: "eth",
      symbol: "ETH",
      swappable: true,
      valueUsd: 3868,
    })
  })
})

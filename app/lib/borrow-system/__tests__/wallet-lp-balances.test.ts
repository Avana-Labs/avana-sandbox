import { describe, expect, it } from "vitest"
import { getWalletLpBalanceUsd } from "@/app/lib/borrow-system/wallet-lp-balances"

describe("getWalletLpBalanceUsd", () => {
  it("returns demo LP balances for catalog pools", () => {
    expect(getWalletLpBalanceUsd("demo-wallet", "uni-v3-bluechip-weth-usdc")).toBe(8_400)
    expect(getWalletLpBalanceUsd("demo-wallet", "uni-v3-bluechip-wbtc-weth")).toBe(6_200)
    expect(getWalletLpBalanceUsd("demo-wallet", "uni-v3-stable-usdc-usdt")).toBe(2_500)
    expect(getWalletLpBalanceUsd("demo-wallet", "curve-crypto-wbtc-eth")).toBeGreaterThan(0)
  })

  it("returns zero for non-demo wallets", () => {
    expect(getWalletLpBalanceUsd("other-wallet", "uni-v3-bluechip-wbtc-weth")).toBe(0)
  })
})

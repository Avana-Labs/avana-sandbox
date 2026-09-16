import { describe, expect, it } from "vitest"
import { buildMultiplyAvailableMarketRows } from "@/app/dashboard/_rewards-components/account-sections-shared"
import { buildMultiplyCatalogMarketsRecord } from "@/app/lib/multiply-system/catalog"
import type { UserAssetBalance } from "@/app/lib/swap-system"

describe("Multiply dashboard available markets", () => {
  it("maps a Convex available bucket to its concrete loop market", () => {
    const balances: UserAssetBalance[] = [
      {
        id: "multiply-wsteth",
        walletId: "wallet-1",
        assetId: "wsteth",
        amount: 2,
        valueUsd: 5_964.36,
        sourceType: "multiply_available",
        sourcePositionId: "wsteth-eth",
      },
    ]

    const [row] = buildMultiplyAvailableMarketRows({
      balances,
      markets: buildMultiplyCatalogMarketsRecord(),
      priceFor: () => 2_982.18,
    })

    expect(row?.market.id).toBe("wsteth-eth")
    expect(row?.market.collateralAsset.symbol).toBe("WSTETH")
    expect(row?.market.borrowAsset.symbol).toBe("ETH")
    expect(row?.valueUsd).toBeCloseTo(5_964.36, 6)
  })

  it("does not duplicate an available bucket across every market sharing a token", () => {
    const markets = buildMultiplyCatalogMarketsRecord()
    const usdcMarkets = Object.values(markets).filter((market) => market.collateralAsset.symbol === "USDC")
    const balances: UserAssetBalance[] = [
      {
        id: "multiply-usdc",
        walletId: "wallet-1",
        assetId: "usdc",
        amount: 1_000,
        valueUsd: 1_000,
        sourceType: "multiply_available",
        sourcePositionId: usdcMarkets[0]?.id,
      },
    ]

    const rows = buildMultiplyAvailableMarketRows({ balances, markets })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.valueUsd).toBe(1_000)
  })
})

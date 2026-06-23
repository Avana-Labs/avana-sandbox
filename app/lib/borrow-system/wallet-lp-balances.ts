import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"

/** Demo wallet LP holdings (USD) keyed by engine market id. */
const DEMO_WALLET_LP_OVERRIDES: Record<string, number> = {
  [HOME_POOL_TO_MARKET_ID["eth-usdc"]!]: 8_400,
  [HOME_POOL_TO_MARKET_ID["wbtc-eth"]!]: 6_200,
  [HOME_POOL_TO_MARKET_ID["usdc-usdt"]!]: 2_500,
}

function demoLpBalanceForMarket(marketId: string): number {
  if (DEMO_WALLET_LP_OVERRIDES[marketId] != null) {
    return DEMO_WALLET_LP_OVERRIDES[marketId]!
  }

  const pool = BORROW_POOL_CATALOG.find((entry) => entry.id === marketId)
  if (!pool) return 0

  return Math.max(1_500, Math.round(pool.availableUsd * 0.02))
}

export function getWalletLpBalanceUsd(walletId: string, marketId: string): number {
  if (walletId !== "demo-wallet") return 0
  return demoLpBalanceForMarket(marketId)
}

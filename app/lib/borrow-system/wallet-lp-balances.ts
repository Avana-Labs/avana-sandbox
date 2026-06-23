import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"

/** Demo wallet LP holdings (USD) keyed by engine market id. */
const DEMO_WALLET_LP_USD: Record<string, number> = {
  [HOME_POOL_TO_MARKET_ID["eth-usdc"]!]: 8_400,
  [HOME_POOL_TO_MARKET_ID["usdc-usdt"]!]: 2_500,
}

export function getWalletLpBalanceUsd(walletId: string, marketId: string): number {
  if (walletId !== "demo-wallet") return 0
  return DEMO_WALLET_LP_USD[marketId] ?? 0
}

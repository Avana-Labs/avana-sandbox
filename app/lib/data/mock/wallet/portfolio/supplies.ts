import type { PortfolioSupplyPosition } from "@/app/lib/data/providers/portfolio/types"

export type WalletSupplyRecord = PortfolioSupplyPosition & {
  walletProfileId: string
}

export const WALLET_SUPPLIES: WalletSupplyRecord[] = [
  {
    id: "supply-dai",
    walletProfileId: "demo-wallet",
    symbol: "DAI",
    name: "Dai Stablecoin",
    balance: 95_100,
    priceUsd: 1,
    suppliedUsd: 95_100,
    earnedUsd: 4_830,
    dailyEarnedUsd: 32.75,
    apyPct: 4.84,
  },
  {
    id: "supply-usdc",
    walletProfileId: "demo-wallet",
    symbol: "USDC",
    name: "USD Coin",
    balance: 220_000,
    priceUsd: 1,
    suppliedUsd: 220_000,
    earnedUsd: 6_400,
    dailyEarnedUsd: 48.2,
    apyPct: 5.12,
  },
  {
    id: "supply-usdt",
    walletProfileId: "demo-wallet",
    symbol: "USDT",
    name: "Tether USD",
    balance: 24_000,
    priceUsd: 1,
    suppliedUsd: 24_000,
    earnedUsd: 1_180,
    dailyEarnedUsd: 9.45,
    apyPct: 4.42,
  },
]

export function getWalletSupplies(walletProfileId: string) {
  return WALLET_SUPPLIES.filter((record) => record.walletProfileId === walletProfileId)
}

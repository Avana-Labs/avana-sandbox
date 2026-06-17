export type WalletDebtRecord = {
  id: string
  walletProfileId: string
  poolId: string
  borrowedUsd: number
  borrowAprPct: number
  accruedInterestUsd: number
  dailyInterestUsd: number
}

export const WALLET_DEBTS: WalletDebtRecord[] = [
  {
    id: "debt-weth-usdc",
    walletProfileId: "demo-wallet",
    poolId: "uni-v3-bluechip-weth-usdc",
    borrowedUsd: 12_400,
    borrowAprPct: 5.7,
    accruedInterestUsd: 74.2,
    dailyInterestUsd: 1.91,
  },
  {
    id: "debt-wbtc-weth",
    walletProfileId: "demo-wallet",
    poolId: "aerodrome-wbtc-weth",
    borrowedUsd: 8_800,
    borrowAprPct: 5.1,
    accruedInterestUsd: 52.8,
    dailyInterestUsd: 1.36,
  },
  {
    id: "debt-usdc-usdt",
    walletProfileId: "demo-wallet",
    poolId: "curve-usdc-usdt",
    borrowedUsd: 6_200,
    borrowAprPct: 5.5,
    accruedInterestUsd: 33.6,
    dailyInterestUsd: 0.94,
  },
]

export function getWalletDebts(walletProfileId: string) {
  return WALLET_DEBTS.filter((record) => record.walletProfileId === walletProfileId)
}

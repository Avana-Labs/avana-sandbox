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
    borrowedUsd: 38_400,
    borrowAprPct: 5.7,
    accruedInterestUsd: 218.4,
    dailyInterestUsd: 5.92,
  },
  {
    id: "debt-crvusd",
    walletProfileId: "demo-wallet",
    poolId: "crvusd",
    borrowedUsd: 12_000,
    borrowAprPct: 5.1,
    accruedInterestUsd: 86.1,
    dailyInterestUsd: 2.03,
  },
  {
    id: "debt-usdc",
    walletProfileId: "demo-wallet",
    poolId: "usdc",
    borrowedUsd: 24_400,
    borrowAprPct: 5.5,
    accruedInterestUsd: 141.8,
    dailyInterestUsd: 4.12,
  },
]

export function getWalletDebts(walletProfileId: string) {
  return WALLET_DEBTS.filter((record) => record.walletProfileId === walletProfileId)
}

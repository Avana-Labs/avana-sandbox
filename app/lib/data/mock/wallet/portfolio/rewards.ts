export type WalletRewardsRecord = {
  walletProfileId: string
  claimableUsd: number
  earnedUsd: number
  settledUsd: number
  pendingUsd: number
}

export const WALLET_REWARDS: WalletRewardsRecord[] = [
  {
    walletProfileId: "demo-wallet",
    claimableUsd: 8_420,
    earnedUsd: 25_600,
    settledUsd: 22_010,
    pendingUsd: 3_590,
  },
]

export function getWalletRewards(walletProfileId: string) {
  return WALLET_REWARDS.find((record) => record.walletProfileId === walletProfileId) ?? WALLET_REWARDS[0]
}

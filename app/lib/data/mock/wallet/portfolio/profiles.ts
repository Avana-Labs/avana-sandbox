import type { PortfolioWalletProfileRecord } from "@/app/lib/data/providers/portfolio/source"

export const WALLET_PROFILES: PortfolioWalletProfileRecord[] = [
  {
    id: "demo-wallet",
    walletAddress: "0x4b9815d5a010bee5ef34ee531a7ae15667fd7acc",
    selectedNetwork: "all",
    networks: ["all", "ethereum", "base", "arbitrum"],
  },
]

export function getWalletProfile(walletProfileId: string) {
  return WALLET_PROFILES.find((profile) => profile.id === walletProfileId) ?? WALLET_PROFILES[0]
}

export function getDefaultWalletProfileId() {
  return WALLET_PROFILES[0]?.id ?? "demo-wallet"
}

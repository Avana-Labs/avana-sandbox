import type { PortfolioWalletProfileRecord } from "@/app/lib/data/providers/portfolio/source"

export const WALLET_PROFILES: PortfolioWalletProfileRecord[] = [
  {
    id: "demo-wallet",
    walletAddress: "0x4b9815d5a010bee5ef34ee531a7ae15667fd7acc",
  },
  // The home "Express" workspace runs on its own wallet so its sandbox session is
  // isolated from the seeded demo portfolio (no inherited debt, separate
  // localStorage). buildMockBorrowSystemState special-cases this id to seed a
  // neutral, debt-free state. Keep it OUT of index 0 so the default profile and
  // the dashboard/borrow pages still resolve to "demo-wallet".
  {
    id: "home-demo-wallet",
    walletAddress: "0x000000000000000000000000000000000000ad0e",
  },
]

export function getWalletProfile(walletProfileId: string) {
  return WALLET_PROFILES.find((profile) => profile.id === walletProfileId) ?? WALLET_PROFILES[0]
}

export function getDefaultWalletProfileId() {
  return WALLET_PROFILES[0]?.id ?? "demo-wallet"
}

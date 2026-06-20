import { getDefaultWalletProfileId } from "@/app/lib/data/mock/wallet/portfolio/profiles"
import { buildDefaultRewardsSessionSeed } from "./storage"

export function getRewardsSessionWalletId() {
  return getDefaultWalletProfileId()
}

export function buildRewardsSessionSeed() {
  return buildDefaultRewardsSessionSeed()
}

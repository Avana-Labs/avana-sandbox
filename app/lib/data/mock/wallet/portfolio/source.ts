import type { PortfolioPageRecords, PortfolioPageSource } from "@/app/lib/data/providers/portfolio/source"
import { getWalletActivity } from "./activity"
import { getWalletDebts } from "./debts"
import {
  getWalletCollaterals,
  getWalletMultiplyPositions,
  getWalletOpenOrders,
  getWalletTwapOrders,
} from "./positions"
import { getDefaultWalletProfileId, getWalletProfile } from "./profiles"
import { getWalletRewards } from "./rewards"
import { getWalletSnapshots } from "./snapshots"
import { WALLET_STRATEGY_BUCKETS } from "./strategies"
import { getWalletSupplies } from "./supplies"

export const mockPortfolioPageSource: PortfolioPageSource = {
  getDefaultWalletProfileId() {
    return getDefaultWalletProfileId()
  },
  async getPortfolioPageRecords(walletProfileId: string): Promise<PortfolioPageRecords> {
    const walletProfile = getWalletProfile(walletProfileId)

    return {
      walletProfile,
      snapshots: getWalletSnapshots(walletProfile.id),
      supplies: getWalletSupplies(walletProfile.id),
      debts: getWalletDebts(walletProfile.id),
      collaterals: getWalletCollaterals(walletProfile.id),
      multiplyPositions: getWalletMultiplyPositions(walletProfile.id),
      openOrders: getWalletOpenOrders(walletProfile.id),
      twapOrders: getWalletTwapOrders(walletProfile.id),
      activity: getWalletActivity(walletProfile.id),
      strategies: WALLET_STRATEGY_BUCKETS,
      rewards: getWalletRewards(walletProfile.id),
    }
  },
}

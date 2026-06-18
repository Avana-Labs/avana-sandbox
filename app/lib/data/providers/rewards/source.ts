import { buildHomeSnapshot } from "@/app/lib/home-data"
import { BORROW_POOL_CATALOG, formatCompactUsd } from "@/app/lib/data/mock/shared/borrow"
import { mockRewardsSharedSource, type RewardsPromoTabId } from "@/app/lib/data/mock/shared/rewards"
import type { RewardsPageData } from "./types"

export type FetchRewardsPageInput = {
  walletProfileId: string
}

export type RewardsPageSource = {
  getRewardsPageData(input: FetchRewardsPageInput): Promise<RewardsPageData>
}

export const mockRewardsPageSource: RewardsPageSource = {
  async getRewardsPageData(input) {
    const homeSnapshot = buildHomeSnapshot()
    const rewardPools = BORROW_POOL_CATALOG
      .filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))
      .sort((left, right) => right.tvlUsd - left.tvlUsd)
      .slice(0, 2)
      .map((pool) => ({
        id: `rewards-${pool.protocol}-${pool.name}`,
        href: `/borrow/pool/${pool.id}`,
        pool,
        title: pool.name,
        subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.tvlUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-emerald-500",
      }))

    return {
      walletProfileId: input.walletProfileId,
      totalPools: homeSnapshot.totalPools,
      completedPools: homeSnapshot.completedPools,
      progressPercentage: homeSnapshot.progressPercentage,
      balanceTotal: mockRewardsSharedSource.getBalanceTotal(),
      rewardPools,
      promoTabs: mockRewardsSharedSource.getPromoTabs(),
      questsByTab: mockRewardsSharedSource.getAllQuests() as Record<RewardsPromoTabId, ReturnType<typeof mockRewardsSharedSource.getQuests>>,
    }
  },
}

import { buildHomeSnapshot } from "@/app/lib/home-data"
import {
  createDataSourceAdapter,
  createUnsupportedSourceError,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { BORROW_POOL_CATALOG, formatCompactUsd } from "@/app/lib/data/mock/shared/borrow"
import { mockRewardsSharedSource, type RewardsPromoTabId } from "@/app/lib/data/mock/shared/rewards"
import type { RewardsPageData } from "./types"

export type FetchRewardsPageInput = {
  walletProfileId: string
}

export type RewardsPageSource = {
  adapter: DataSourceAdapter
  getRewardsPageData(
    input: FetchRewardsPageInput,
    context?: DataSourceRequestContext,
  ): Promise<DataSourceResponse<RewardsPageData>>
}

export const mockRewardsPageAdapter = createDataSourceAdapter({
  id: "rewards-mock",
  label: "Rewards page mock source",
  mode: "mock",
})

export const liveRewardsPageAdapter = createDataSourceAdapter({
  id: "rewards-live",
  label: "Rewards page live source",
  mode: "live",
})

export const mockRewardsPageSource: RewardsPageSource = {
  adapter: mockRewardsPageAdapter,
  async getRewardsPageData(input) {
    const homeSnapshot = buildHomeSnapshot()
    const rewardPools = BORROW_POOL_CATALOG
      .filter((pool) => pool.visuals.every((visual) => Boolean(visual.iconUrl)))
      .sort((left, right) => right.tvlUsd - left.tvlUsd)
      .slice(0, 2)
      .map((pool) => ({
        id: `rewards-${pool.id}`,
        href: `/borrow/markets/${pool.id}`,
        pool,
        title: pool.name,
        subtitle: `${pool.feeTier} fee · ${formatCompactUsd(pool.tvlUsd)} TVL`,
        value: formatCompactUsd(pool.tvlUsd),
        delta: `${((pool.aprMin + pool.aprMax) / 2).toFixed(1)}% APY`,
        deltaClassName: "text-emerald-500",
      }))

    return {
      fetchedAt: new Date().toISOString(),
      data: {
        walletProfileId: input.walletProfileId,
        totalPools: homeSnapshot.totalPools,
        completedPools: homeSnapshot.completedPools,
        progressPercentage: homeSnapshot.progressPercentage,
        balanceTotal: mockRewardsSharedSource.getBalanceTotal(),
        rewardPools,
        promoTabs: mockRewardsSharedSource.getPromoTabs(),
        questsByTab: mockRewardsSharedSource.getAllQuests() as Record<RewardsPromoTabId, ReturnType<typeof mockRewardsSharedSource.getQuests>>,
      },
    }
  },
}

export const liveRewardsPageSource: RewardsPageSource = {
  adapter: liveRewardsPageAdapter,
  async getRewardsPageData() {
    throw createUnsupportedSourceError(liveRewardsPageAdapter, "getRewardsPageData")
  },
}

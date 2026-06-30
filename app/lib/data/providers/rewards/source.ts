import { buildHomeSnapshot } from "@/app/lib/home-data"
import {
  createDataSourceAdapter,
  type DataSourceAdapter,
  type DataSourceRequestContext,
  type DataSourceResponse,
} from "@/app/lib/data/core/source-runtime"
import { api } from "@/convex/_generated/api"
import { BORROW_POOL_CATALOG, formatCompactUsd } from "@/app/lib/data/mock/shared/borrow"
import { mockRewardsSharedSource } from "@/app/lib/data/mock/shared/rewards"
import { REWARDS_PROMO_TABS, type RewardsPromoTabId, type RewardsQuestIconId } from "@/app/lib/data/rewards/catalog"
import { buildDefaultRewardsCatalog, calculateRewardSummary, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import type { RewardsSessionState } from "@/app/lib/rewards-system/contracts"
import { getAuthenticatedConvexClient } from "@/app/lib/data/providers/live-convex-client"
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
        deltaClassName: "text-apy-positive",
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
  async getRewardsPageData(input) {
    const { client, wallet } = getAuthenticatedConvexClient(liveRewardsPageAdapter.id, "getRewardsPageData")
    if (input.walletProfileId && input.walletProfileId.toLowerCase() !== wallet) {
      throw new Error("Requested rewards do not match the authenticated wallet.")
    }
    const [stored, markets] = await Promise.all([
      client.query(api.sandbox.rewards.getState, { wallet }),
      client.query(api.markets.listMarketSnapshots),
    ])
    const state: RewardsSessionState = stored
      ? (JSON.parse(stored.stateJson) as RewardsSessionState)
      : {
          events: [],
          claims: [],
          referralProfiles: {},
          relationships: [],
          firstLoginAt: Date.now(),
          favoriteMarketIds: [],
        }
    const now = Date.now()
    const tasks = buildDefaultRewardsCatalog(now)
    const progress = evaluateAllTasksForUser({
      tasks,
      wallet,
      events: state.events,
      claims: state.claims,
      now,
      firstLoginAt: state.firstLoginAt,
    })
    const summary = calculateRewardSummary({
      tasks,
      wallet,
      events: state.events,
      claims: state.claims,
      now,
      firstLoginAt: state.firstLoginAt,
    })
    const progressByTask = new Map(progress.map((entry) => [entry.taskId, entry]))
    const iconForTag = (tag: string): RewardsQuestIconId => {
      if (tag === "lend") return "droplets"
      if (tag === "borrow") return "rocket"
      if (tag === "multiply") return "layers3"
      if (tag === "referral") return "link2"
      if (tag === "streak") return "flame"
      if (tag === "risk" || tag === "education") return "shieldCheck"
      if (tag === "mastery") return "trophy"
      return "wallet"
    }
    const questsByTab = tasks.reduce<RewardsPageData["questsByTab"]>(
      (result, task) => {
        const tab: RewardsPromoTabId =
          task.category === "new_user"
            ? "new-users"
            : task.category === "challenge"
              ? "challenge-tasks"
              : "refer-a-friend"
        const taskProgress = progressByTask.get(task.id)
        result[tab].push({
          id: task.id,
          title: task.title,
          description: task.description,
          reward: `${task.rewardAmount} ${task.rewardSymbol}`,
          cta: taskProgress?.status === "claimed" ? "Claimed" : task.actionLabel,
          category: task.tag,
          iconId: iconForTag(task.tag),
        })
        return result
      },
      { "new-users": [], "challenge-tasks": [], "refer-a-friend": [] },
    )

    return {
      fetchedAt: new Date().toISOString(),
      data: {
        walletProfileId: wallet,
        totalPools: markets.length,
        completedPools: summary.completedTaskCount,
        progressPercentage: Math.round((summary.completedTaskCount / Math.max(1, summary.totalTaskCount)) * 100),
        balanceTotal: summary.totalClaimedAmount,
        rewardPools: [],
        promoTabs: REWARDS_PROMO_TABS,
        questsByTab,
      },
    }
  },
}

"use client"

import { useEffect, useMemo, useState } from "react"
import type { RewardsPromoTabId, RewardsQuest, RewardsQuestIconId } from "@/app/lib/data/mock/shared/rewards"
import type { RewardsPageData } from "@/app/lib/data/providers/rewards"
import { useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { RewardTask, UserRewardProgress } from "@/app/lib/rewards-engine"
import { RewardsBalanceHero } from "./rewards-balance-hero"
import { RewardsTabs } from "./rewards-tabs"

type RewardsSnapshot = {
  summary: {
    completedTaskCount: number
    claimableTaskCount: number
    totalTaskCount: number
    totalEarnedAmount: number
    totalClaimableAmount: number
    totalClaimedAmount: number
  }
  progress: UserRewardProgress[]
}

type RewardCardViewModel = RewardsQuest & {
  status: UserRewardProgress["status"]
  progressLabel: string
}

function toPromoTabId(category: RewardTask["category"]): RewardsPromoTabId {
  if (category === "new_user") return "new-users"
  if (category === "challenge") return "challenge-tasks"
  return "refer-a-friend"
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

function tagToIconId(tag: RewardTask["tag"]): RewardsQuestIconId {
  switch (tag) {
    case "lend":
      return "droplets"
    case "borrow":
      return "rocket"
    case "multiply":
      return "layers3"
    case "referral":
      return "link2"
    case "risk":
      return "shieldCheck"
    case "rewards":
      return "sparkles"
    case "streak":
      return "flame"
    case "integration":
      return "orbit"
    case "mastery":
      return "trophy"
    case "education":
      return "shieldCheck"
    case "simulation":
      return "target"
    default:
      return "wallet"
  }
}

function buildProgressLabel(progress: UserRewardProgress) {
  if (progress.status === "claimed") return "Claimed"
  if (progress.status === "claimable") return "Ready to claim"
  if (progress.status === "expired") return "Expired"
  return `${Math.min(progress.progress, progress.target)}/${progress.target} complete`
}

function mapTaskToQuest(task: RewardTask, progress: UserRewardProgress): RewardCardViewModel {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    reward: `${task.rewardAmount} ${task.rewardSymbol}`,
    cta: progress.status === "claimable" ? "Claim" : progress.status === "claimed" ? "Claimed" : task.actionLabel,
    category: titleCase(task.tag),
    iconId: tagToIconId(task.tag),
    status: progress.status,
    progressLabel: buildProgressLabel(progress),
  }
}

export function RewardsPageClient({ pageData }: { pageData: RewardsPageData }) {
  const rewards = useRewardsSessionContext()
  const [snapshot, setSnapshot] = useState<RewardsSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [summary, progress] = await Promise.all([
        rewards.readAdapter.readRewardSummary(rewards.walletId),
        rewards.readAdapter.readProgress(rewards.walletId),
      ])

      if (!cancelled) {
        setSnapshot({ summary, progress })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [rewards, rewards.state])

  const questsByTab = useMemo(() => {
    const progressByTaskId = new Map(snapshot?.progress.map((item) => [item.taskId, item]))
    return rewards.tasks.reduce<Record<RewardsPromoTabId, RewardCardViewModel[]>>(
      (accumulator, task) => {
        const progress = progressByTaskId.get(task.id)
        if (!progress) return accumulator
        accumulator[toPromoTabId(task.category)].push(mapTaskToQuest(task, progress))
        return accumulator
      },
      {
        "new-users": [],
        "challenge-tasks": [],
        "refer-a-friend": [],
      },
    )
  }, [rewards.tasks, snapshot?.progress])

  const progressPercentage = snapshot ? Math.round((snapshot.summary.completedTaskCount / Math.max(1, snapshot.summary.totalTaskCount)) * 100) : pageData.progressPercentage

  return (
    <>
      <RewardsBalanceHero
        rewardPools={pageData.rewardPools}
        balanceTotal={snapshot?.summary.totalEarnedAmount ?? pageData.balanceTotal}
        claimableCount={snapshot?.summary.claimableTaskCount ?? 0}
        completedCount={snapshot?.summary.completedTaskCount ?? pageData.completedPools}
        totalCount={snapshot?.summary.totalTaskCount ?? pageData.totalPools}
        progressPercentage={progressPercentage}
        onClaimAll={() => rewards.claimAllRewards()}
      />

      <RewardsTabs
        promoTabs={pageData.promoTabs}
        questsByTab={questsByTab}
        onClaimTask={(taskId) => rewards.claimReward(taskId)}
      />
    </>
  )
}

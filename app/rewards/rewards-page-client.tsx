"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { RewardsPromoTabId, RewardsQuest, RewardsQuestIconId } from "@/app/lib/data/mock/shared/rewards"
import type { RewardsPageData } from "@/app/lib/data/providers/rewards"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { RewardTask, UserRewardProgress } from "@/app/lib/rewards-engine"
import {
  canRunTaskAction,
  findTaskById,
  getSandboxTour,
  getTaskActionKind,
  getTaskDeepLink,
  isReferralTaskAction,
} from "@/app/lib/rewards-engine/task-actions"
import { RewardsBalanceHero } from "./rewards-balance-hero"
import { RewardsTabs } from "./rewards-tabs"
import { RewardsEducationDialog, RewardsFavoriteDialog, RewardsReferralDialog, RewardsSimulateDialog } from "./rewards-task-dialogs"

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

function formatDuration(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function isReferralClaimCta(task: RewardTask) {
  const actionKind = getTaskActionKind(task)
  if (actionKind === "copy_referral") return "View link & claim"
  if (actionKind === "sandbox_referral_invite") return "View invite & claim"
  if (isReferralTaskAction(actionKind)) return "View crew & claim"
  return `Claim ${task.rewardAmount} AVA`
}

function buildProgressLabel(task: RewardTask, progress: UserRewardProgress, firstLoginAt: number, now: number) {
  if (progress.status === "claimed") return "Claimed"
  if (progress.status === "claimable") return "Ready to claim"
  if (progress.status === "expired") return "Expired"

  if (task.requirement.type === "wait_since_login" && firstLoginAt > 0) {
    const remaining = task.requirement.waitMs - (now - firstLoginAt)
    if (remaining > 0) return `Unlocks in ${formatDuration(remaining)}`
  }

  if (task.requirement.type === "aggregate_volume") {
    return `${Math.round(progress.progress)}/${progress.target} USD`
  }

  return `${Math.min(Math.round(progress.progress), progress.target)}/${progress.target} complete`
}

function mapTaskToQuest(
  task: RewardTask,
  progress: UserRewardProgress,
  firstLoginAt: number,
  now: number,
): RewardCardViewModel {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    reward: `${task.rewardAmount} ${task.rewardSymbol}`,
    cta:
      progress.status === "claimable"
        ? isReferralClaimCta(task)
        : progress.status === "claimed"
          ? "Claimed"
          : task.actionKind === "wait_timer"
            ? "Waiting"
            : task.actionLabel,
    category: titleCase(task.tag),
    iconId: tagToIconId(task.tag),
    status: progress.status,
    progressLabel: buildProgressLabel(task, progress, firstLoginAt, now),
  }
}

export function RewardsPageClient({ pageData }: { pageData: RewardsPageData }) {
  const router = useRouter()
  const avana = useAvanaSessions()
  const {
    walletId,
    state,
    tasks,
    readAdapter,
    claimReward,
    claimAllRewards,
    completeEducation,
    favoriteMarket,
    recordSimulation,
    recordSandboxTour,
    recordDailyCheckin,
    runReferralSandboxStep,
    createReferralCode,
    recordReferralLinkCopied,
  } = useRewardsSessionContext()

  const [snapshot, setSnapshot] = useState<RewardsSnapshot | null>(null)
  const [now, setNow] = useState(Date.now())
  const [isClaiming, setIsClaiming] = useState(false)
  const [educationOpen, setEducationOpen] = useState(false)
  const [favoriteOpen, setFavoriteOpen] = useState(false)
  const [simulateOpen, setSimulateOpen] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)
  const [referralTaskId, setReferralTaskId] = useState<string | null>(null)
  const [referralLink, setReferralLink] = useState("")
  const [referralCode, setReferralCode] = useState("")

  const reloadSnapshot = useCallback(async () => {
    const [summary, progress] = await Promise.all([
      readAdapter.readRewardSummary(walletId),
      readAdapter.readProgress(walletId),
    ])
    setSnapshot({ summary, progress })
    setNow(Date.now())
  }, [readAdapter, walletId])

  useEffect(() => {
    void reloadSnapshot()
  }, [reloadSnapshot, state.events.length, state.claims.length, state.firstLoginAt])

  const hasPendingWaitTask = useMemo(
    () =>
      snapshot?.progress.some((entry) => {
        const task = tasks.find((item) => item.id === entry.taskId)
        return task?.actionKind === "wait_timer" && entry.status === "in_progress"
      }) ?? false,
    [snapshot?.progress, tasks],
  )

  useEffect(() => {
    if (!hasPendingWaitTask) return undefined
    const timer = window.setInterval(() => {
      void reloadSnapshot()
      setNow(Date.now())
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [hasPendingWaitTask, reloadSnapshot])

  const questsByTab = useMemo(() => {
    const progressByTaskId = new Map(snapshot?.progress.map((item) => [item.taskId, item]))
    return tasks.reduce<Record<RewardsPromoTabId, RewardCardViewModel[]>>(
      (accumulator, task) => {
        const progress = progressByTaskId.get(task.id)
        if (!progress) return accumulator
        accumulator[toPromoTabId(task.category)].push(
          mapTaskToQuest(task, progress, state.firstLoginAt, now),
        )
        return accumulator
      },
      {
        "new-users": [],
        "challenge-tasks": [],
        "refer-a-friend": [],
      },
    )
  }, [tasks, snapshot?.progress, state.firstLoginAt, now])

  const progressPercentage = snapshot
    ? Math.round((snapshot.summary.completedTaskCount / Math.max(1, snapshot.summary.totalTaskCount)) * 100)
    : pageData.progressPercentage

  const runReferralActivations = useCallback(
    async () => {
      await runReferralSandboxStep("activate")
    },
    [runReferralSandboxStep],
  )

  const referralTask = referralTaskId ? tasks.find((task) => task.id === referralTaskId) ?? null : null
  const referralProgress = snapshot?.progress.find((item) => item.taskId === referralTaskId) ?? null

  const openReferralDialog = useCallback((taskId: string) => {
    setReferralTaskId(taskId)
    setReferralOpen(true)
  }, [])

  const handleSimulate = useCallback(
    async (product: "borrow" | "lend" | "multiply") => {
      if (product === "lend") {
        const intent = avana.lend.createIntent({
          type: "deposit",
          walletId,
          marketId: "gho",
          depositAmount: 100,
          walletBalance: 10_000,
        })
        await avana.lend.previewTransaction(intent)
      } else if (product === "borrow") {
        const pool = avana.borrow.collateralPools[0]
        const asset = pool ? avana.borrow.getBorrowableAssetsForMarket(pool.id)[0] : undefined
        if (!pool || !asset) throw new Error("Borrow sandbox is not ready")
        const intent = avana.borrow.createIntent({
          type: "borrow",
          walletId,
          marketId: pool.id,
          assetId: asset.id,
          amountUsd6: 100_000_000n,
          at: Date.now(),
        })
        await avana.borrow.previewTransaction(intent)
      } else {
        const intent = avana.multiply.createIntent({
          type: "multiply",
          walletId,
          marketId: "eth-usdt",
          collateralAmount: 500,
          selectedMultiplier: 2,
        })
        await avana.multiply.previewTransaction(intent)
      }
      await recordSimulation(product)
      await reloadSnapshot()
    },
    [avana.borrow, avana.lend, avana.multiply, recordSimulation, reloadSnapshot, walletId],
  )

  const handleTaskAction = useCallback(
    async (taskId: string) => {
      const task = findTaskById(taskId)
      const progress = snapshot?.progress.find((item) => item.taskId === taskId)
      if (!task || !progress) return

      const actionKind = getTaskActionKind(task)

      if (isReferralTaskAction(actionKind)) {
        openReferralDialog(taskId)
        return
      }

      if (progress.status === "claimable") {
        if (isClaiming) return
        setIsClaiming(true)
        try {
          await claimReward(taskId)
          await reloadSnapshot()
        } finally {
          setIsClaiming(false)
        }
        return
      }

      if (!canRunTaskAction(progress, actionKind)) return

      switch (actionKind) {
        case "education_modal":
          setEducationOpen(true)
          return
        case "favorite_modal":
          setFavoriteOpen(true)
          return
        case "simulate_modal":
          setSimulateOpen(true)
          return
        case "deep_link": {
          const href = getTaskDeepLink(taskId)
          if (href) router.push(href)
          return
        }
        case "sandbox_tour": {
          await recordSandboxTour(taskId)
          const tour = getSandboxTour(taskId)
          if (tour?.href) router.push(tour.href)
          await reloadSnapshot()
          return
        }
        case "product_action":
          if (taskId === "4-week-activity-streak") {
            await recordDailyCheckin()
            await reloadSnapshot()
            return
          }
          if (getTaskDeepLink(taskId)) {
            router.push(getTaskDeepLink(taskId)!)
          }
          return
        default:
          return
      }
    },
    [
      claimReward,
      isClaiming,
      openReferralDialog,
      recordDailyCheckin,
      recordSandboxTour,
      reloadSnapshot,
      router,
      snapshot?.progress,
    ],
  )

  const handleClaimAll = useCallback(async () => {
    if (isClaiming) return
    setIsClaiming(true)
    try {
      await claimAllRewards()
      await reloadSnapshot()
    } finally {
      setIsClaiming(false)
    }
  }, [claimAllRewards, isClaiming, reloadSnapshot])

  return (
    <>
      <RewardsBalanceHero
        rewardPools={pageData.rewardPools}
        balanceTotal={snapshot?.summary.totalClaimedAmount ?? pageData.balanceTotal}
        claimableAmount={snapshot?.summary.totalClaimableAmount ?? 0}
        claimableCount={snapshot?.summary.claimableTaskCount ?? 0}
        completedCount={snapshot?.summary.completedTaskCount ?? pageData.completedPools}
        totalCount={snapshot?.summary.totalTaskCount ?? pageData.totalPools}
        progressPercentage={progressPercentage}
        isClaiming={isClaiming}
        onClaimAll={() => {
          void handleClaimAll()
        }}
      />

      <RewardsTabs
        promoTabs={pageData.promoTabs}
        questsByTab={questsByTab}
        onTaskAction={(taskId) => handleTaskAction(taskId)}
      />

      <RewardsEducationDialog
        open={educationOpen}
        onOpenChange={setEducationOpen}
        onComplete={async () => {
          await completeEducation()
          await reloadSnapshot()
        }}
      />

      <RewardsFavoriteDialog
        open={favoriteOpen}
        onOpenChange={setFavoriteOpen}
        onFavorite={async (marketId) => {
          await favoriteMarket(marketId)
          await reloadSnapshot()
        }}
      />

      <RewardsSimulateDialog
        open={simulateOpen}
        onOpenChange={setSimulateOpen}
        onSimulate={handleSimulate}
      />

      <RewardsReferralDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        task={referralTask}
        progress={referralProgress}
        referralLink={referralLink}
        referralCode={referralCode}
        onEnsureProfile={async () => {
          const profile = await createReferralCode()
          setReferralLink(profile.referralLink)
          setReferralCode(profile.referralCode)
        }}
        onCopyLink={async () => {
          const profile = await createReferralCode()
          setReferralLink(profile.referralLink)
          setReferralCode(profile.referralCode)
          await recordReferralLinkCopied()
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(profile.referralLink)
          }
          await reloadSnapshot()
        }}
        onSendInvite={async () => {
          await runReferralSandboxStep("invite")
          await reloadSnapshot()
        }}
        onActivateNext={async () => {
          await runReferralActivations()
          await reloadSnapshot()
        }}
        onMarkFunded={async () => {
          await runReferralSandboxStep("fund")
          await reloadSnapshot()
        }}
        onClaim={async () => {
          if (!referralTaskId || isClaiming) return
          setIsClaiming(true)
          try {
            await claimReward(referralTaskId)
            await reloadSnapshot()
          } finally {
            setIsClaiming(false)
          }
        }}
      />
    </>
  )
}

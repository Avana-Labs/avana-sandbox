"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  REWARDS_PROMO_TABS,
  REWARDS_QUESTS_PER_TAB,
  emptyRewardsQuestsByTab,
  resolveRewardsPromoTab,
  type RewardsPromoTabId,
  type RewardsQuest,
  type RewardsQuestIconId,
} from "@/app/lib/data/rewards/catalog"
import type { RewardsPageData } from "@/app/lib/data/providers/rewards"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { RewardTask, UserRewardProgress } from "@/app/lib/rewards-engine"
import { calculateRewardSummary, evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import {
  canRunTaskAction,
  findTaskById,
  getSandboxTour,
  getTaskActionKind,
  getTaskDeepLink,
  isReferralTaskAction,
} from "@/app/lib/rewards-engine/task-actions"
import { RewardsPageSkeleton } from "@/app/components/loading-states"
import { buildRewardsActivityHistory } from "@/app/lib/rewards-system"
import { RewardsBalanceHero, PortfolioRewardsCards } from "./rewards-balance-hero"
import { PortfolioQuickActions } from "./portfolio-quick-actions"
import { LendOpportunity } from "./lend-opportunity"
import { LearnSection } from "./learn-section"
import { RecentActivity } from "@/app/portfolio/recent-activity"
import { mapTransactionHistoryToActivityRows } from "@/app/lib/borrow-system/read-model"
import { buildLendActivityHistory } from "@/app/lib/lend-system/read-model"
import { usePortfolioPage } from "@/app/portfolio/use-portfolio-page"
import { RewardsTabs } from "./rewards-tabs"
import { MobileDetailActionBar } from "@/app/components/detail-page-primitives"
import { primaryCtaClass } from "@/app/components/action-page/action-cta"
import Link from "next/link"
import {
  RewardsEducationDialog,
  RewardsFavoriteDialog,
  RewardsReferralDialog,
  RewardsSimulateDialog,
} from "./rewards-task-dialogs"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { useCurrency } from "@/app/lib/currency/use-currency"

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

function isReferralClaimCta(task: RewardTask, t: (key: string) => string) {
  const actionKind = getTaskActionKind(task)
  if (actionKind === "copy_referral") return t("View link & claim")
  if (actionKind === "sandbox_referral_invite") return t("View invite & claim")
  if (isReferralTaskAction(actionKind)) return t("View crew & claim")
  return t("Claim {amount} AVA").replace("{amount}", String(task.rewardAmount))
}

function buildProgressLabel(
  task: RewardTask,
  progress: UserRewardProgress,
  firstLoginAt: number,
  now: number,
  t: (key: string) => string,
  exact: (usd: number) => string,
) {
  if (progress.status === "claimed") return t("Claimed")
  if (progress.status === "claimable") return t("Ready to claim")
  if (progress.status === "expired") return t("Expired")

  if (task.requirement.type === "wait_since_login" && firstLoginAt > 0) {
    const remaining = task.requirement.waitMs - (now - firstLoginAt)
    if (remaining > 0) return t("Unlocks in {duration}").replace("{duration}", formatDuration(remaining))
  }

  if (task.requirement.type === "aggregate_volume") {
    return t("{progress}/{target} {currency}")
      .replace("{progress}", exact(Math.round(progress.progress)))
      .replace("{target}", exact(progress.target))
      .replace("{currency}", "")
      .trim()
  }

  return t("{progress}/{target} complete")
    .replace("{progress}", String(Math.min(Math.round(progress.progress), progress.target)))
    .replace("{target}", String(progress.target))
}

function buildRewardsSnapshot(
  walletId: string,
  tasks: RewardTask[],
  state: {
    events: Parameters<typeof evaluateAllTasksForUser>[0]["events"]
    claims: Parameters<typeof evaluateAllTasksForUser>[0]["claims"]
    firstLoginAt: number
  },
  now: number,
): RewardsSnapshot {
  const progress = evaluateAllTasksForUser({
    tasks,
    wallet: walletId,
    events: state.events,
    claims: state.claims,
    now,
    firstLoginAt: state.firstLoginAt,
  })
  const summary = calculateRewardSummary({
    tasks,
    wallet: walletId,
    events: state.events,
    claims: state.claims,
    now,
    firstLoginAt: state.firstLoginAt,
  })

  return { summary, progress }
}

function mapTaskToQuest(
  task: RewardTask,
  progress: UserRewardProgress,
  firstLoginAt: number,
  now: number,
  t: (key: string) => string,
  exact: (usd: number) => string,
): RewardCardViewModel {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    reward: `${task.rewardAmount} ${task.rewardSymbol}`,
    cta:
      progress.status === "claimable"
        ? isReferralClaimCta(task, t)
        : progress.status === "claimed"
          ? t("Claimed")
          : task.actionKind === "wait_timer"
            ? t("Waiting")
            : task.actionLabel,
    category: titleCase(task.tag),
    iconId: tagToIconId(task.tag),
    status: progress.status,
    progressLabel: buildProgressLabel(task, progress, firstLoginAt, now, t, exact),
  }
}

export function RewardsPageClient({ pageData }: { pageData?: RewardsPageData }) {
  const router = useRouter()
  const { t } = useTranslation()
  const { exact } = useCurrency()
  const avana = useAvanaSessions()
  const {
    walletId,
    state,
    hasHydratedStorage,
    tasks,
    claimReward,
    completeEducation,
    favoriteMarket,
    recordSimulation,
    recordSandboxTour,
    recordDailyCheckin,
    runReferralSandboxStep,
    createReferralCode,
    recordReferralLinkCopied,
  } = useRewardsSessionContext()
  // Full portfolio recent activity (all products) so the rewards table isn't claims-only.
  const { data: portfolioData } = usePortfolioPage({ walletProfileId: walletId })

  const [now, setNow] = useState(0)
  const [isClaiming, setIsClaiming] = useState(false)
  const [educationOpen, setEducationOpen] = useState(false)
  const [favoriteOpen, setFavoriteOpen] = useState(false)
  const [simulateOpen, setSimulateOpen] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)
  const [referralTaskId, setReferralTaskId] = useState<string | null>(null)
  const [referralLink, setReferralLink] = useState("")
  const [referralCode, setReferralCode] = useState("")

  const snapshot = useMemo(() => {
    if (!hasHydratedStorage) return null
    return buildRewardsSnapshot(walletId, tasks, state, now > 0 ? now : Date.now())
  }, [hasHydratedStorage, now, state.claims, state.events, state.firstLoginAt, tasks, walletId])

  const reloadSnapshot = useCallback(() => {
    setNow(Date.now())
  }, [])

  useEffect(() => {
    if (!hasHydratedStorage) return
    reloadSnapshot()
  }, [hasHydratedStorage, reloadSnapshot, state.events.length, state.claims.length, state.firstLoginAt])

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
    const tickIfVisible = () => {
      if (document.visibilityState === "visible") reloadSnapshot()
    }
    const timer = window.setInterval(tickIfVisible, 5_000)
    document.addEventListener("visibilitychange", tickIfVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", tickIfVisible)
    }
  }, [hasPendingWaitTask, reloadSnapshot])

  const questsByTab = useMemo(() => {
    if (!snapshot) return emptyRewardsQuestsByTab<RewardCardViewModel>()

    const progressByTaskId = new Map(snapshot.progress.map((item) => [item.taskId, item]))
    const grouped = tasks.reduce<Record<RewardsPromoTabId, RewardCardViewModel[]>>((accumulator, task) => {
      const progress = progressByTaskId.get(task.id)
      if (!progress) return accumulator
      accumulator[resolveRewardsPromoTab(task)].push(mapTaskToQuest(task, progress, state.firstLoginAt, now, t, exact))
      return accumulator
    }, emptyRewardsQuestsByTab<RewardCardViewModel>())

    // "Getting started" is no longer its own tab — its quests now lead the Lend tab.
    grouped.lend = [...grouped["getting-started"], ...grouped.lend]
    grouped["getting-started"] = []

    // Show at most 6 cards per tab (catalog order). Any extra claimable quests
    // stay claimable through the sidebar / mobile claim rail.
    for (const key of Object.keys(grouped) as RewardsPromoTabId[]) {
      grouped[key] = grouped[key].slice(0, REWARDS_QUESTS_PER_TAB)
    }
    return grouped
  }, [tasks, snapshot, state.firstLoginAt, now, t, exact])

  const runReferralActivations = useCallback(async () => {
    await runReferralSandboxStep("activate")
  }, [runReferralSandboxStep])

  const referralTask = referralTaskId ? (tasks.find((task) => task.id === referralTaskId) ?? null) : null
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
      reloadSnapshot()
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
          reloadSnapshot()
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
          reloadSnapshot()
          return
        }
        case "product_action":
          if (taskId === "4-week-activity-streak") {
            await recordDailyCheckin()
            reloadSnapshot()
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

  if (!hasHydratedStorage || !snapshot) {
    return <RewardsPageSkeleton />
  }

  const claimHref = snapshot.summary.claimableTaskCount > 0 ? "/actions/rewards/claim" : undefined
  const rewardActivityRows = buildRewardsActivityHistory(walletId, state.claims, tasks)
  // One combined "recent activity" table: live session actions + the full portfolio
  // activity (all products) + reward claims, deduped by tx hash (session rows win).
  const combinedActivityRows = [
    ...mapTransactionHistoryToActivityRows(avana.borrow.transactionHistory, avana.borrow.state.markets),
    ...avana.multiply.transactionHistory.map((item) => ({
      id: item.id,
      at: new Date(item.timestamp).toISOString(),
      product: "multiply" as const,
      kind: item.kind === "multiply" ? ("open" as const) : ("reduce" as const),
      status: item.status === "success" ? ("confirmed" as const) : ("failed" as const),
      amountUsd: item.kind === "multiply" ? item.amountUsd : -item.amountUsd,
      primaryLabel: item.kind === "multiply" ? "Simulated multiply" : "Simulated deleverage",
      secondaryLabel: `${item.multiplierBefore.toFixed(2)}x → ${item.multiplierAfter.toFixed(2)}x`,
      txHash: item.hash,
    })),
    ...buildLendActivityHistory(avana.lend.walletId, avana.lend.transactionHistory, avana.lend.state),
    ...(portfolioData?.activity.rows ?? []),
    ...rewardActivityRows,
  ]
  const seenTxHashes = new Set<string>()
  const allActivityRows = combinedActivityRows.filter((row) => {
    if (seenTxHashes.has(row.txHash)) return false
    seenTxHashes.add(row.txHash)
    return true
  })

  return (
    <>
      <RewardsBalanceHero claimHref={claimHref} />

      {/* Mobile: quick actions right after the hero chart (desktop shows them in the sidebar). */}
      <div className="mb-8 lg:hidden">
        <PortfolioQuickActions />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-8">
        <div className="min-w-0">
          <RewardsTabs
            promoTabs={pageData?.promoTabs ?? REWARDS_PROMO_TABS}
            questsByTab={questsByTab}
            onTaskAction={(taskId) => handleTaskAction(taskId)}
          />
        </div>

        <aside className="hidden space-y-8 lg:block lg:self-start">
          <PortfolioQuickActions />
          <LendOpportunity />
        </aside>
      </div>

      <div className="mb-8 md:mb-10">
        <LearnSection />
      </div>

      {/* Mobile: rewards cards + lend opportunity near the end (desktop shows these in the hero/sidebar). */}
      <div className="mb-8 space-y-8 lg:hidden">
        <PortfolioRewardsCards claimHref={claimHref} />
        <LendOpportunity />
      </div>

      <div className="pb-24 lg:pb-0">
        <RecentActivity rows={allActivityRows} />
      </div>

      <MobileDetailActionBar>
        {claimHref ? (
          <Link href={claimHref} className={primaryCtaClass({ size: "compact", className: "w-full" })}>
            {t("Claim rewards")}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={primaryCtaClass({ size: "compact", disabled: true, className: "w-full" })}
          >
            {t("No rewards ready")}
          </button>
        )}
      </MobileDetailActionBar>

      <RewardsEducationDialog
        open={educationOpen}
        onOpenChange={setEducationOpen}
        onComplete={async () => {
          await completeEducation()
          reloadSnapshot()
        }}
      />

      <RewardsFavoriteDialog
        open={favoriteOpen}
        onOpenChange={setFavoriteOpen}
        onFavorite={async (marketId) => {
          await favoriteMarket(marketId)
          reloadSnapshot()
        }}
      />

      <RewardsSimulateDialog open={simulateOpen} onOpenChange={setSimulateOpen} onSimulate={handleSimulate} />

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
          reloadSnapshot()
        }}
        onSendInvite={async () => {
          await runReferralSandboxStep("invite")
          reloadSnapshot()
        }}
        onActivateNext={async () => {
          await runReferralActivations()
          reloadSnapshot()
        }}
        onMarkFunded={async () => {
          await runReferralSandboxStep("fund")
          reloadSnapshot()
        }}
        onClaim={async () => {
          if (!referralTaskId || isClaiming) return
          setIsClaiming(true)
          try {
            await claimReward(referralTaskId)
            reloadSnapshot()
          } finally {
            setIsClaiming(false)
          }
        }}
      />
    </>
  )
}

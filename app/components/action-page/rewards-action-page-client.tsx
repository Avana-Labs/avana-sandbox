"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionBlockedUi, ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { evaluateAllTasksForUser } from "@/app/lib/rewards-engine"
import { mapRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionBlockedDialog } from "@/app/components/action-page/action-blocked-dialog"
import { formatActionUsd } from "@/app/lib/action-system/formatters"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { mapPreviewToBlockedUi } from "@/app/lib/action-system/blocked-ui"
import { isConfigureVisibleStage } from "@/app/lib/action-system/stage-machine"

function truncateWallet(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function RewardsActionPageClient({ closeHref = "/rewards" }: { closeHref?: string }) {
  const descriptor = getActionDescriptor("rewards", "claim")
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const rewards = useRewardsSessionContext()
  const [amount, setAmount] = useState("")
  const [stage, setStage] = useState<ActionStage>("configure")
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [blockedUi, setBlockedUi] = useState<ActionBlockedUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [claimSummary, setClaimSummary] = useState({ claimUsd: 0, claimableTaskCount: 0, tokenBreakdown: [] as Array<{ symbol: string; amount: number }> })

  useEffect(() => {
    void rewards.readAdapter.readRewardSummary(walletId).then((summary) => {
      const progress = evaluateAllTasksForUser({
        tasks: rewards.tasks,
        wallet: walletId,
        events: rewards.state.events,
        claims: rewards.state.claims,
        now: Date.now(),
      })
      const tokenBreakdown = progress
        .filter((entry) => entry.claimableAmount > 0)
        .map((entry) => {
          const task = rewards.tasks.find((item) => item.id === entry.taskId)
          return {
            symbol: task?.rewardSymbol ?? "POINTS",
            amount: entry.claimableAmount,
          }
        })
      setClaimSummary({
        claimUsd: summary.totalClaimableAmount,
        claimableTaskCount: summary.claimableTaskCount,
        tokenBreakdown,
      })
      setAmount(String(summary.totalClaimableAmount || ""))
    })
  }, [rewards.readAdapter, rewards.state.claims, rewards.state.events, rewards.tasks, walletId])

  const previewUi: ActionPreviewUi = useMemo(
    () =>
      mapRewardsClaimPreviewToActionUi({
        allowed: claimSummary.claimUsd > 0,
        claimUsd: claimSummary.claimUsd,
        marketLabel: "Avana rewards",
        claimableTaskCount: claimSummary.claimableTaskCount,
        tokenBreakdown: claimSummary.tokenBreakdown,
        blockedReason: claimSummary.claimUsd > 0 ? null : "Nothing to claim",
      }),
    [claimSummary],
  )

  useEffect(() => {
    if (!previewUi.allowed && stage === "configure") {
      const blocked = mapPreviewToBlockedUi({ product: "rewards", kind: "claim", blockedReason: previewUi.blockedReason })
      if (blocked) {
        setBlockedUi(blocked)
        setStage("blocked")
      }
    }
  }, [previewUi.allowed, previewUi.blockedReason, stage])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!previewUi.allowed) return

    setIsPending(true)
    setOutcome(null)

    try {
      const simulated = rewards.readAdapter.mode === "sandbox"
      const claims = await runActionSubmitFlow({
        simulated,
        needsAllowance: false,
        onStage: setStage,
        execute: async () => {
          const result = await rewards.claimAllRewards()
          if (!result.length) throw new Error("Nothing to claim")
          return {
            receipt: {
              status: "success" as const,
              hash: result[0]?.syntheticTxHash ?? result[0]?.claimId ?? "sandbox-receipt",
            },
          }
        },
      })

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${formatActionUsd(claimSummary.claimUsd)} in rewards claimed.`,
          receiptHash: claims.receipt.hash ?? null,
          metrics: previewUi.metrics,
          href: "/rewards",
          primaryCtaLabel: "View rewards",
          preview: previewUi,
          verb: descriptor.primaryVerb,
        }),
      )
      setStage("success")
    } catch (error) {
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Unable to claim rewards",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [claimSummary.claimUsd, closeHref, descriptor.primaryVerb, previewUi, rewards, router, stage])

  const hideTitle = stage === "success" || stage === "processing" || stage === "blocked"

  return (
    <ActionPageShell title={descriptor.title} subtitle={descriptor.subtitle} hideTitle={hideTitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref} simulated={rewards.readAdapter.mode === "sandbox"}>
      {stage === "processing" ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={setAmount}
          preview={previewUi}
          onPrimary={() => void handlePrimary()}
          secondaryHref={closeHref}
          onMax={() => setAmount(String(claimSummary.claimUsd))}
          isPending={isPending}
          outcome={outcome}
        />
      ) : null}

      {blockedUi ? <ActionBlockedDialog blocked={blockedUi} open={stage === "blocked"} onClose={() => setStage("configure")} /> : null}
    </ActionPageShell>
  )
}

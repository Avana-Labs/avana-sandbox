"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useRewardsSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionPageMode, ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapRewardsClaimPreviewToActionUi } from "@/app/lib/action-system/adapters/rewards-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { formatActionUsd } from "@/app/lib/action-system/formatters"

function truncateWallet(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function RewardsActionPageClient({ mode = "page", closeHref = "/rewards" }: { mode?: ActionPageMode; closeHref?: string }) {
  const descriptor = getActionDescriptor("rewards", "claim")
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const rewards = useRewardsSessionContext()
  const [claimUsd, setClaimUsd] = useState(0)
  const [amount, setAmount] = useState("")
  const [stage, setStage] = useState<ActionStage>("configure")
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    void rewards.readAdapter.readRewardSummary(walletId).then((summary) => {
      setClaimUsd(summary.totalClaimableAmount)
      setAmount(String(summary.totalClaimableAmount || ""))
    })
  }, [rewards.readAdapter, walletId])

  const previewUi: ActionPreviewUi = useMemo(
    () =>
      mapRewardsClaimPreviewToActionUi({
        allowed: claimUsd > 0,
        claimUsd,
        tokenLabel: "Rewards",
        marketLabel: "Avana rewards",
        blockedReason: claimUsd > 0 ? null : "Nothing to claim",
      }),
    [claimUsd],
  )

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!previewUi.allowed) return

    setStage("submitting")
    setIsPending(true)
    setOutcome(null)

    try {
      const claims = await rewards.claimAllRewards()
      if (!claims.length) throw new Error("Nothing to claim")

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${formatActionUsd(claimUsd)} in rewards claimed.`,
          receiptHash: claims[0]?.id ?? "sandbox-receipt",
          metrics: previewUi.metrics,
          href: "/rewards",
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
  }, [claimUsd, closeHref, descriptor.primaryVerb, previewUi, rewards, router, stage])

  return (
    <ActionPageShell mode={mode} title={descriptor.title} subtitle={descriptor.subtitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref}>
      {stage === "success" && successUi ? (
        <ActionSuccessStage success={successUi} onSecondary={() => router.push(closeHref)} />
      ) : (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={setAmount}
          preview={previewUi}
          onPrimary={() => void handlePrimary()}
          onSecondary={() => router.push(closeHref)}
          onMax={() => setAmount(String(claimUsd))}
          isPending={isPending}
          outcome={outcome}
        />
      )}
    </ActionPageShell>
  )
}

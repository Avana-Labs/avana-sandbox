"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapDeleveragePreviewToActionUi, mapMultiplyPreviewToActionUi } from "@/app/lib/action-system/adapters/multiply-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { runActionSubmitFlow } from "@/app/lib/action-system/action-submit-runtime"
import { dashboardHrefForProduct, successDashboardCtaLabel } from "@/app/lib/action-system/dashboard-routing"
import { isConfigureVisibleStage, reviewStageTitle } from "@/app/lib/action-system/stage-machine"

function truncateWallet(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function MultiplyActionPageClient({
  kind,
  closeHref = "/multiply",
  initialMarketId,
  initialAmount = "",
  initialMultiplier = "2",
}: {
  kind: "multiply" | "deleverage"
  closeHref?: string
  initialMarketId?: string
  initialAmount?: string
  initialMultiplier?: string
}) {
  const descriptor = getActionDescriptor("multiply", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useMultiplySessionContext()
  const [selectedMarketId, setSelectedMarketId] = useState<string | undefined>(initialMarketId)
  const market = useMemo(() => {
    const markets = Object.values(session.state.markets)
    return (
      markets.find((entry) => entry.id === selectedMarketId) ??
      markets.find((entry) => entry.id === initialMarketId) ??
      markets[0] ??
      null
    )
  }, [initialMarketId, selectedMarketId, session.state.markets])

  const marketOptions = useMemo(() => {
    if (kind !== "multiply") return undefined
    const options = Object.values(session.state.markets).map((entry) => ({
      id: entry.id,
      label: `${entry.collateralAsset.symbol} · ${entry.borrowAsset.symbol}`,
      symbol: entry.collateralAsset.symbol,
    }))
    return options.length > 1 ? options : undefined
  }, [kind, session.state.markets])

  const multiplierOptions = useMemo(() => {
    const max = market?.risk.publicMaxMultiplier ?? 5
    const presets = [1.5, 2, 3, 5, 7, 10]
    const withinRange = presets.filter((preset) => preset <= max + 1e-9)
    const rounded = Math.round(max * 10) / 10
    if (!withinRange.includes(rounded) && rounded >= 1.5) withinRange.push(rounded)
    return withinRange.length > 0 ? withinRange : [Math.max(1.5, rounded)]
  }, [market])

  const [stage, setStage] = useState<ActionStage>("configure")
  const [amount, setAmount] = useState(initialAmount)
  const [multiplier, setMultiplier] = useState(initialMultiplier)
  const [previewUi, setPreviewUi] = useState<ActionPreviewUi | null>(null)
  const [successUi, setSuccessUi] = useState<ActionSuccessUi | null>(null)
  const [outcome, setOutcome] = useState<{ tone: "error" | "success"; title: string; message: string } | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!market) return
    const parsedAmount = Number.parseFloat(amount)
    const parsedMultiplier = Number.parseFloat(multiplier)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
      setPreviewUi(null)
      return
    }

    const position =
      session.state.positions[`${walletId}:${market.id}`] ??
      Object.values(session.state.positions).find((entry) => entry.walletId === walletId && entry.marketId === market.id)

    const action =
      kind === "multiply"
        ? ({
            type: "multiply" as const,
            walletId,
            marketId: market.id,
            collateralAmount: parsedAmount,
            selectedMultiplier: parsedMultiplier,
          } as const)
        : ({
            type: "deleverage" as const,
            walletId,
            positionId: position?.id ?? "missing",
            targetMultiplier: parsedMultiplier,
          } as const)

    void session.previewTransaction(session.createIntent(action)).then((preview) => {
      setPreviewUi(
        kind === "multiply"
          ? mapMultiplyPreviewToActionUi(preview, {
              collateralSymbol: market.collateralAsset.symbol,
              collateralAmount: parsedAmount,
              marketLabel: `${market.collateralAsset.symbol} · ${market.borrowAsset.symbol}`,
              multiplier: parsedMultiplier,
            })
          : mapDeleveragePreviewToActionUi(preview, {
              marketLabel: `${market.collateralAsset.symbol} · ${market.borrowAsset.symbol}`,
              targetMultiplier: parsedMultiplier,
            }),
      )
    })
  }, [amount, kind, market, multiplier, session, walletId])

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("configure")
      setOutcome(null)
      return
    }
    router.push(closeHref)
  }, [closeHref, router, stage])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(successUi?.primaryCtaHref ?? dashboardHrefForProduct("multiply"))
      return
    }
    if (stage === "configure") {
      if (!market || !previewUi?.allowed) return
      setStage("review")
      return
    }
    if (stage !== "review") return
    if (!market || !previewUi?.allowed) return

    setIsPending(true)
    setOutcome(null)

    try {
      const parsedAmount = Number.parseFloat(amount)
      const parsedMultiplier = Number.parseFloat(multiplier)
      const position =
        session.state.positions[`${walletId}:${market.id}`] ??
        Object.values(session.state.positions).find((entry) => entry.walletId === walletId && entry.marketId === market.id)
      if (kind === "deleverage" && !position) throw new Error("No position selected")

      const action =
        kind === "multiply"
          ? {
              type: "multiply" as const,
              walletId,
              marketId: market.id,
              collateralAmount: parsedAmount,
              selectedMultiplier: parsedMultiplier,
            }
          : {
              type: "deleverage" as const,
              walletId,
              positionId: position!.id,
              targetMultiplier: parsedMultiplier,
            }

      const intent = session.createIntent(action)
      const preview = await session.previewTransaction(intent)
      if (!preview.allowed) throw new Error(preview.validationErrors[0] ?? "Action unavailable")

      const simulated = session.readAdapter.mode === "sandbox"
      const result = await runActionSubmitFlow({
        simulated,
        needsAllowance: false,
        onStage: setStage,
        execute: async () => session.executeTransaction(preview.intent),
      })

      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")

      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${parsedMultiplier.toFixed(2)}x on ${market.collateralAsset.symbol} processed.`,
          receiptHash: result.receipt.hash ?? null,
          metrics: previewUi.metrics,
          href: dashboardHrefForProduct("multiply"),
          primaryCtaLabel: successDashboardCtaLabel("multiply"),
          preview: previewUi,
          verb: descriptor.primaryVerb,
        }),
      )
      setStage("success")
    } catch (error) {
      setOutcome({
        tone: "error",
        title: "Something went wrong",
        message: error instanceof Error ? error.message : "Transaction was cancelled",
      })
      setStage("error")
    } finally {
      setIsPending(false)
    }
  }, [amount, closeHref, descriptor.primaryVerb, kind, market, multiplier, previewUi, router, session, stage, successUi, walletId])

  if (!market) return null

  const hideTitle = stage === "success" || stage === "processing" || stage === "blocked" || stage === "review"

  return (
    <ActionPageShell title={descriptor.title} subtitle={descriptor.subtitle} hideTitle={hideTitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref} simulated={session.readAdapter.mode === "sandbox"}>
      {stage === "processing" ? (
        <ActionProcessingStage verb={descriptor.primaryVerb} preview={previewUi} closeHref={closeHref} />
      ) : null}

      {stage === "review" && previewUi ? (
        <ActionReviewStage
          title={reviewStageTitle(descriptor.primaryVerb)}
          subtitle="Confirm the details below before signing."
          preview={previewUi}
          primaryLabel={descriptor.primaryVerb}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
        />
      ) : null}

      {stage === "success" && successUi ? <ActionSuccessStage success={successUi} closeHref={closeHref} /> : null}

      {isConfigureVisibleStage(stage) ? (
        <ActionConfigureStage
          stage={stage === "error" ? "configure" : stage}
          verb={descriptor.primaryVerb}
          amount={amount}
          onAmountChange={setAmount}
          preview={previewUi}
          assetSymbol={market.collateralAsset.symbol}
          assetOptions={marketOptions}
          selectedAssetId={market.id}
          onAssetSelect={(id) => {
            setSelectedMarketId(id)
            setAmount("")
          }}
          multiplier={multiplier}
          onMultiplierChange={setMultiplier}
          multiplierOptions={multiplierOptions}
          onPrimary={() => void handlePrimary()}
          onSecondary={handleBack}
          secondaryHref={closeHref}
          isPending={isPending}
          outcome={outcome}
        />
      ) : null}
    </ActionPageShell>
  )
}

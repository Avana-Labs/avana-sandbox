"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAvanaSessions, useMultiplySessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { ActionPageMode } from "@/app/lib/action-system/contracts"
import { getActionDescriptor } from "@/app/lib/action-system/contracts"
import { mapMultiplyPreviewToActionUi } from "@/app/lib/action-system/adapters/multiply-preview-mapper"
import { mapBorrowSuccessToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"
import type { ActionPreviewUi, ActionStage, ActionSuccessUi } from "@/app/lib/action-system/contracts"
import { ActionPageShell } from "@/app/components/action-page/action-page-shell"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"

function truncateWallet(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 6)}...${id.slice(-4)}`
}

export function MultiplyActionPageClient({
  kind,
  mode = "page",
  closeHref = "/multiply",
  initialMarketId,
  initialAmount = "1",
  initialMultiplier = "2",
}: {
  kind: "multiply" | "deleverage"
  mode?: ActionPageMode
  closeHref?: string
  initialMarketId?: string
  initialAmount?: string
  initialMultiplier?: string
}) {
  const descriptor = getActionDescriptor("multiply", kind)
  const router = useRouter()
  const { walletId } = useAvanaSessions()
  const session = useMultiplySessionContext()
  const market = useMemo(() => {
    const markets = Object.values(session.state.markets)
    return markets.find((entry) => entry.id === initialMarketId) ?? markets[0] ?? null
  }, [initialMarketId, session.state.markets])

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
      Object.values(session.state.positions).find(
        (entry) => entry.walletId === walletId && entry.marketId === market.id,
      )

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
        mapMultiplyPreviewToActionUi(preview, {
          collateralSymbol: market.collateralAsset.symbol,
          collateralAmount: parsedAmount,
          marketLabel: `${market.collateralAsset.symbol} · ${market.borrowAsset.symbol}`,
          multiplier: parsedMultiplier,
        }),
      )
    })
  }, [amount, kind, market, multiplier, session, walletId])

  const handlePrimary = useCallback(async () => {
    if (stage === "success") {
      router.push(closeHref)
      return
    }
    if (!market || !previewUi?.allowed) return
    setStage("submitting")
    setIsPending(true)
    try {
      const parsedAmount = Number.parseFloat(amount)
      const parsedMultiplier = Number.parseFloat(multiplier)
      const position =
        session.state.positions[`${walletId}:${market.id}`] ??
        Object.values(session.state.positions).find(
          (entry) => entry.walletId === walletId && entry.marketId === market.id,
        )
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
      const result = await session.executeTransaction(preview.intent)
      if (result.receipt.status !== "success") throw new Error(result.receipt.error ?? "Transaction failed")
      setSuccessUi(
        mapBorrowSuccessToActionUi({
          title: `${descriptor.primaryVerb} successful`,
          description: `${parsedMultiplier.toFixed(2)}x on ${market.collateralAsset.symbol} processed.`,
          receiptHash: result.receipt.hash,
          metrics: previewUi.metrics,
          href: "/multiply",
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
  }, [amount, closeHref, descriptor.primaryVerb, kind, market, multiplier, previewUi, router, session, stage, walletId])

  if (!market) return null

  return (
    <ActionPageShell mode={mode} title={descriptor.title} subtitle={descriptor.subtitle} walletLabel={truncateWallet(walletId)} closeHref={closeHref} simulated={session.readAdapter.mode === "sandbox"}>
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
          isPending={isPending}
          outcome={outcome}
        />
      )}
    </ActionPageShell>
  )
}

"use client"

import { useCallback, useMemo, useState } from "react"
import type { BorrowAction } from "@/app/lib/credit-engine"
import type { ActionBoxStage, ActionBoxSuccessUi, BorrowActionKind } from "./action-box-contract"
import { canAdvanceStage, terminalStagesForAction } from "./action-box-contract"
import type { SandboxActionResult, TransactionIntent, TransactionPreview } from "./contracts"
import { mapPreviewToActionBoxUi } from "./preview-ui"

type BorrowSessionLike = {
  createIntent: (action: BorrowAction) => TransactionIntent
  previewTransaction: (intent: TransactionIntent) => Promise<TransactionPreview>
  executeTransaction: (intent: TransactionIntent) => Promise<SandboxActionResult>
  isPending: boolean
}

function actionKindFromIntent(intent: TransactionIntent): BorrowActionKind {
  if (intent.actionType === "liquidate") return "liquidate-preview"
  return intent.actionType
}

function nextStage(kind: BorrowActionKind, stage: ActionBoxStage): ActionBoxStage | null {
  const stages = terminalStagesForAction(kind)
  const index = stages.indexOf(stage)
  if (index === -1 || index === stages.length - 1) return null
  return stages[index + 1] ?? null
}

export function useBorrowActionBox(session: BorrowSessionLike) {
  const [stage, setStage] = useState<ActionBoxStage>("entry")
  const [intent, setIntent] = useState<TransactionIntent | null>(null)
  const [preview, setPreview] = useState<TransactionPreview | null>(null)
  const [successUi, setSuccessUi] = useState<ActionBoxSuccessUi | null>(null)

  const previewUi = useMemo(() => (preview ? mapPreviewToActionBoxUi(preview) : null), [preview])
  const actionKind = intent ? actionKindFromIntent(intent) : null
  const previewOnly = actionKind === "liquidate-preview"

  const reset = useCallback(() => {
    setStage("entry")
    setIntent(null)
    setPreview(null)
    setSuccessUi(null)
  }, [])

  const prepareAction = useCallback(
    async (action: BorrowAction) => {
      const nextIntent = session.createIntent(action)
      const nextPreview = await session.previewTransaction(nextIntent)
      setIntent(nextIntent)
      setPreview(nextPreview)
      setSuccessUi(null)
      setStage("preview")
      return { intent: nextIntent, preview: nextPreview }
    },
    [session],
  )

  const advance = useCallback(async () => {
    if (!intent || !previewUi || !actionKind) return null

    if (stage === "processing") {
      return null
    }

    if (stage === "approve") {
      setStage("processing")
      const result = await session.executeTransaction(intent)
      setPreview(result.preview)
      setSuccessUi({
        receipt: result.receipt,
        title: result.receipt.status === "success" ? "Transaction successful" : "Transaction failed",
        description: result.receipt.error ?? "Simulated transaction completed.",
        rows: mapPreviewToActionBoxUi(result.preview).rows,
      })
      setStage("success")
      return result
    }

    const upcoming = nextStage(actionKind, stage)
    if (!upcoming) return null

    if (!canAdvanceStage(actionKind, stage, previewUi)) {
      return null
    }

    setStage(upcoming)
    return null
  }, [actionKind, intent, previewUi, session, stage])

  return {
    stage,
    intent,
    preview,
    previewUi,
    successUi,
    previewOnly,
    isPending: session.isPending,
    canSubmit: !session.isPending && (stage !== "review" || (previewUi?.allowed ?? false)),
    prepareAction,
    advance,
    reset,
    setStage,
  }
}

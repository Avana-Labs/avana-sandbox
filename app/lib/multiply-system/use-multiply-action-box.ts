"use client"

import { useCallback, useMemo, useState } from "react"
import type { MultiplyAction } from "@/app/lib/multiply-engine"
import type { MultiplySandboxActionResult, MultiplyTransactionIntent, MultiplyTransactionPreview } from "./contracts"

type MultiplySessionLike = {
  createIntent: (action: MultiplyAction) => MultiplyTransactionIntent
  previewTransaction: (intent: MultiplyTransactionIntent) => Promise<MultiplyTransactionPreview>
  executeTransaction: (intent: MultiplyTransactionIntent) => Promise<MultiplySandboxActionResult>
  isPending: boolean
}

type ActionBoxStage = "entry" | "preview" | "approve" | "processing" | "success"

export function useMultiplyActionBox(session: MultiplySessionLike) {
  const [stage, setStage] = useState<ActionBoxStage>("entry")
  const [intent, setIntent] = useState<MultiplyTransactionIntent | null>(null)
  const [preview, setPreview] = useState<MultiplyTransactionPreview | null>(null)

  const reset = useCallback(() => {
    setStage("entry")
    setIntent(null)
    setPreview(null)
  }, [])

  const prepareAction = useCallback(
    async (action: MultiplyAction) => {
      const nextIntent = session.createIntent(action)
      const nextPreview = await session.previewTransaction(nextIntent)
      setIntent(nextIntent)
      setPreview(nextPreview)
      setStage("preview")
      return { intent: nextIntent, preview: nextPreview }
    },
    [session],
  )

  const refreshPreview = useCallback(
    async (action: MultiplyAction) => {
      const nextIntent = session.createIntent(action)
      const nextPreview = await session.previewTransaction(nextIntent)
      setPreview(nextPreview)
      return nextPreview
    },
    [session],
  )

  const advance = useCallback(async () => {
    if (!intent || !preview) return null

    if (stage === "preview") {
      setStage("approve")
      return null
    }

    if (stage === "approve") {
      setStage("processing")
      const result = await session.executeTransaction(intent)
      setPreview(result.preview)
      setStage("success")
      return result
    }

    return null
  }, [intent, preview, session, stage])

  const canAdvance = useMemo(() => {
    if (!preview) return false
    if (stage === "preview") return preview.allowed
    if (stage === "approve") return preview.allowed
    return false
  }, [preview, stage])

  return {
    stage,
    intent,
    preview,
    prepareAction,
    refreshPreview,
    advance,
    reset,
    canAdvance,
    isPending: session.isPending || stage === "processing",
  }
}

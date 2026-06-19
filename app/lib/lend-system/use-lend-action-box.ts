"use client"

import { useCallback, useMemo, useState } from "react"
import type { LendAction } from "@/app/lib/lend-engine"
import type { LendSandboxActionResult, LendTransactionIntent, LendTransactionPreview } from "./contracts"

type LendSessionLike = {
  createIntent: (action: LendAction) => LendTransactionIntent
  previewTransaction: (intent: LendTransactionIntent) => Promise<LendTransactionPreview>
  executeTransaction: (intent: LendTransactionIntent) => Promise<LendSandboxActionResult>
  isPending: boolean
}

type ActionBoxStage = "entry" | "preview" | "approve" | "processing" | "success"

export function useLendActionBox(session: LendSessionLike) {
  const [stage, setStage] = useState<ActionBoxStage>("entry")
  const [intent, setIntent] = useState<LendTransactionIntent | null>(null)
  const [preview, setPreview] = useState<LendTransactionPreview | null>(null)

  const reset = useCallback(() => {
    setStage("entry")
    setIntent(null)
    setPreview(null)
  }, [])

  const prepareAction = useCallback(
    async (action: LendAction) => {
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
    async (action: LendAction) => {
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
    if (stage === "preview" || stage === "approve") return preview.allowed
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

import type { TransactionIntent, TransactionPreview, TransactionResult, TransactionRiskLabel } from "./contracts"

export type BorrowActionKind = "deposit" | "borrow" | "repay" | "withdraw" | "claim" | "liquidate-preview"

export type ActionBoxStage = "entry" | "preview" | "review" | "approve" | "processing" | "success"

export type ActionBoxMetricRow = {
  label: string
  value: string
  tone?: "positive" | "warning" | "danger" | "neutral"
}

export type ActionBoxPreviewUi = {
  allowed: boolean
  riskLabel: TransactionRiskLabel
  validationErrors: string[]
  warnings: string[]
  rows: ActionBoxMetricRow[]
  ctaLabel: string
  blockedReason: string | null
}

export type ActionBoxSuccessUi = {
  receipt: TransactionResult
  rows: ActionBoxMetricRow[]
  title: string
  description: string
}

export type ActionBoxFlowState = {
  stage: ActionBoxStage
  intent: TransactionIntent | null
  preview: TransactionPreview | null
  previewUi: ActionBoxPreviewUi | null
  successUi: ActionBoxSuccessUi | null
  isPending: boolean
  previewOnly: boolean
}

export function terminalStagesForAction(kind: BorrowActionKind): ActionBoxStage[] {
  if (kind === "liquidate-preview") {
    return ["entry", "preview", "review"]
  }
  return ["entry", "preview", "review", "approve", "processing", "success"]
}

export function canAdvanceStage(kind: BorrowActionKind, stage: ActionBoxStage, preview: ActionBoxPreviewUi | null) {
  if (stage === "preview" || stage === "review") {
    return preview?.allowed ?? false
  }
  if (kind === "liquidate-preview" && stage === "review") {
    return false
  }
  return true
}

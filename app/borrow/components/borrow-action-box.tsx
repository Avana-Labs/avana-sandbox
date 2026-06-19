"use client"

import { TransactionFlowPanel } from "@/app/components/transaction-flow"
import type { ActionBoxStage } from "@/app/lib/borrow-system/action-box-contract"
import type { ActionBoxPreviewUi, ActionBoxSuccessUi } from "@/app/lib/borrow-system/action-box-contract"

type BorrowActionBoxProps = {
  stage: ActionBoxStage
  actionLabel: string
  amountLabel: string
  title: string
  subtitle: string
  previewUi: ActionBoxPreviewUi | null
  successUi: ActionBoxSuccessUi | null
  simulated?: boolean
  previewOnly?: boolean
  isPending?: boolean
  primaryLabel: string
  onPrimary?: () => void
  onBack?: () => void
  onClose?: () => void
}

export function BorrowActionBox({
  stage,
  actionLabel,
  amountLabel,
  title,
  subtitle,
  previewUi,
  successUi,
  simulated = true,
  previewOnly = false,
  isPending = false,
  primaryLabel,
  onPrimary,
  onBack,
  onClose,
}: BorrowActionBoxProps) {
  const flowStage =
    stage === "preview" || stage === "entry"
      ? "review"
      : stage === "approve" || stage === "processing" || stage === "success" || stage === "review"
        ? stage
        : "review"
  const rows = successUi?.rows ?? previewUi?.rows ?? []

  return (
    <TransactionFlowPanel
      stage={flowStage}
      actionLabel={actionLabel}
      amountLabel={amountLabel}
      title={successUi?.title ?? title}
      subtitle={successUi?.description ?? subtitle}
      rows={rows.map((row) => ({
        label: row.label,
        value: row.value,
        tone: row.tone ?? "default",
      }))}
      note={previewUi?.warnings[0] ?? undefined}
      blockedReason={previewUi?.blockedReason}
      simulated={simulated}
      previewOnly={previewOnly}
      receiptHash={successUi?.receipt.hash ?? null}
      submitDisabled={isPending || previewUi?.allowed === false}
      primaryLabel={primaryLabel}
      onPrimary={onPrimary}
      onBack={onBack}
      onClose={onClose}
      variant="bare"
    />
  )
}

"use client"

import { useMemo } from "react"
import { formatFixed, parseFixed, simulateLiquidation, type BorrowSystemState } from "@/app/lib/credit-engine"
import { BorrowActionBox } from "@/app/borrow/components/borrow-action-box"
import { mapPreviewToActionBoxUi } from "@/app/lib/borrow-system/preview-ui"

type LiquidationPreviewPanelProps = {
  state: BorrowSystemState
  walletId: string
  positionId: string
  debtPositionId: string
  amountUsd: number
}

export function LiquidationPreviewPanel({ state, walletId, positionId, debtPositionId, amountUsd }: LiquidationPreviewPanelProps) {
  const preview = useMemo(
    () =>
      simulateLiquidation(state, {
        type: "liquidate",
        walletId,
        positionId,
        debtPositionId,
        repayAmountUsd6: parseFixed(amountUsd.toFixed(6), 6),
      }),
    [amountUsd, debtPositionId, positionId, state, walletId],
  )

  const previewUi = mapPreviewToActionBoxUi({
    intent: {
      id: "liquidation-preview",
      actionType: "liquidate",
      walletId,
      positionId,
      debtPositionId,
      amountUsd6: parseFixed(amountUsd.toFixed(6), 6),
      requestedAt: Date.now(),
      simulated: true,
    },
    allowed: preview.allowed,
    warnings: preview.warnings,
    validationErrors: preview.validationErrors,
    riskLabel: preview.riskLabel,
    before: preview.before.metrics,
    after: preview.after.metrics,
  })

  return (
    <BorrowActionBox
      stage="review"
      actionLabel="liquidation"
      amountLabel={formatFixed(parseFixed(amountUsd.toFixed(6), 6), 6)}
      title="Liquidation preview"
      subtitle="Estimated liquidation outcome. No transaction will be submitted."
      previewUi={previewUi}
      successUi={null}
      previewOnly
      simulated
      primaryLabel="Close preview"
    />
  )
}

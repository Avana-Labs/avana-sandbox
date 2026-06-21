"use client"

import { useMemo } from "react"
import { parseFixed, simulateLiquidation, type BorrowSystemState } from "@/app/lib/credit-engine"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import { mapLiquidationPreviewToActionUi } from "@/app/lib/action-system/adapters/borrow-preview-mapper"

type LiquidationPreviewPanelProps = {
  state: BorrowSystemState
  walletId: string
  positionId: string
  debtPositionId: string
  amountUsd: number
  onClose?: () => void
}

export function LiquidationPreviewPanel({
  state,
  walletId,
  positionId,
  debtPositionId,
  amountUsd,
  onClose,
}: LiquidationPreviewPanelProps) {
  const previewUi = useMemo(() => {
    const simulation = simulateLiquidation(state, {
      type: "liquidate",
      walletId,
      positionId,
      debtPositionId,
      repayAmountUsd6: parseFixed(amountUsd.toFixed(6), 6),
    })

    const debtPosition = state.accounts[walletId]?.debtPositions.find((entry) => entry.id === debtPositionId)
    const debtAsset = debtPosition ? state.assets[debtPosition.assetId] : null
    const collateralPosition = state.accounts[walletId]?.collateralPositions.find((entry) => entry.id === positionId)
    const market = collateralPosition?.marketId ? state.markets[collateralPosition.marketId] : null

    return mapLiquidationPreviewToActionUi(simulation, {
      amountUsd,
      marketLabel: market?.display.name ?? "Collateral market",
      debtSymbol: debtAsset?.symbol ?? "Asset",
    })
  }, [amountUsd, debtPositionId, positionId, state, walletId])

  return (
    <ActionReviewStage
      title="Liquidation preview"
      subtitle="Estimated liquidation outcome. No transaction will be submitted."
      preview={previewUi}
      primaryLabel="Close preview"
      onPrimary={onClose}
    />
  )
}

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { BorrowActionBox } from "@/app/borrow/components/borrow-action-box"
import { buildHomeRemovePreview, buildHomeRepayPreview } from "@/app/lib/borrow-system/modal-preview-runtime"
import type { BorrowModalSession } from "@/app/lib/borrow-system/modal-session"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { HOME_COLLATERAL_POOLS, type HomeCollateralPool } from "@/app/lib/data/borrow-domain"
import { CompactRemoveCard } from "@/app/components/home/remove-card"
import { CompactRepayCard } from "@/app/components/home/repay-card"

export type RepayRemoveMode = "repay" | "remove"

export type RepayRemoveContext = {
  pool: HomeCollateralPool
  currentDebtUsd: number
  mode: RepayRemoveMode
  borrowApr?: number
  debtPositionId?: string
  collateralPositionId?: string
}

export type RepayRemoveResult = {
  pool: HomeCollateralPool
  mode: RepayRemoveMode
  amountUsd: number
  percent?: number
  healthFactorAfter: number | null
  receiptHash?: string
}

type Props = {
  open: boolean
  context: RepayRemoveContext | null
  borrowSession: BorrowModalSession
  walletId: string
  onClose: () => void
  onConfirm: (result: RepayRemoveResult) => void
}

export function RepayRemoveModal({ open, context, borrowSession, walletId, onClose, onConfirm }: Props) {
  const actionBox = useBorrowActionBox(borrowSession)
  const [amountInput, setAmountInput] = useState("")
  const [percent, setPercent] = useState(25)
  const [flowStarted, setFlowStarted] = useState(false)
  const [pendingReviewAdvance, setPendingReviewAdvance] = useState(false)

  useEffect(() => {
    if (open && context) {
      setAmountInput("")
      setPercent(25)
      setFlowStarted(false)
      setPendingReviewAdvance(false)
      actionBox.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context])

  const isRemove = context?.mode === "remove"
  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0
  const pool = context?.pool ?? HOME_COLLATERAL_POOLS[0]

  const repayPreview = useMemo(() => {
    if (!context || isRemove) return null
    return buildHomeRepayPreview(borrowSession.state, walletId, context.debtPositionId ?? null, safeAmountUsd)
  }, [borrowSession.state, context, isRemove, safeAmountUsd, walletId])

  const removePreview = useMemo(() => {
    if (!context || !isRemove) return null
    return buildHomeRemovePreview(borrowSession.state, walletId, context.pool.id, percent)
  }, [borrowSession.state, context, isRemove, percent, walletId])

  const handleClose = useCallback(() => {
    if (actionBox.stage === "processing" || borrowSession.isPending) return
    setFlowStarted(false)
    actionBox.reset()
    onClose()
  }, [actionBox, borrowSession.isPending, onClose])

  const startReviewFlow = useCallback(async () => {
    if (!context) return
    if (isRemove) {
      if (!context.collateralPositionId || !removePreview || removePreview.safePercent <= 0) return
      await actionBox.prepareAction({
        type: "removeCollateral",
        walletId,
        positionId: context.collateralPositionId,
        percentBps: percent * 100,
      })
    } else {
      if (!context.debtPositionId || !repayPreview?.isValid) return
      await actionBox.prepareAction({
        type: "repay",
        walletId,
        debtPositionId: context.debtPositionId,
        amountUsd6: parseFixed(safeAmountUsd.toFixed(6), 6),
      })
    }
    setFlowStarted(true)
    setPendingReviewAdvance(true)
  }, [actionBox, context, isRemove, percent, removePreview, repayPreview?.isValid, safeAmountUsd, walletId])

  useEffect(() => {
    if (!pendingReviewAdvance || actionBox.stage !== "preview" || !actionBox.previewUi?.allowed) return
    setPendingReviewAdvance(false)
    void actionBox.advance()
  }, [actionBox, pendingReviewAdvance])

  const handlePrimary = useCallback(async () => {
    if (actionBox.stage === "success") {
      onConfirm({
        pool,
        mode: context?.mode ?? "repay",
        amountUsd: isRemove ? (removePreview?.removeUsd ?? 0) : safeAmountUsd,
        percent: isRemove ? percent : undefined,
        healthFactorAfter:
          actionBox.preview?.after.healthFactorWad != null
            ? Number.parseFloat(formatFixed(actionBox.preview.after.healthFactorWad, 18))
            : null,
        receiptHash: actionBox.successUi?.receipt.hash,
      })
      handleClose()
      return
    }

    if (actionBox.stage === "approve") {
      await actionBox.advance()
      return
    }

    await actionBox.advance()
  }, [actionBox, context?.mode, handleClose, isRemove, onConfirm, percent, pool, removePreview?.removeUsd, safeAmountUsd])

  if (!context || (!repayPreview && !removePreview)) return null

  const primaryLabel =
    actionBox.stage === "success"
      ? "Done"
      : actionBox.stage === "approve"
        ? "Approve wallet"
        : actionBox.stage === "review"
          ? isRemove
            ? "Remove liquidity"
            : "Repay now"
          : (actionBox.previewUi?.ctaLabel ?? "Continue")

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        fullScreenOnMobile
        hideMobileHandle
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">{isRemove ? "Remove liquidity" : "Repay debt"}</DialogTitle>
        {!flowStarted ? (
          <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
              {isRemove ? (
                <CompactRemoveCard
                  pool={pool}
                  percent={percent}
                  preview={removePreview!}
                  submitLabel="Review removal"
                  flatHero
                  onOpenPoolDialog={() => {}}
                  onPercentChange={setPercent}
                  onSubmit={() => {
                    void startReviewFlow()
                  }}
                />
              ) : (
                <CompactRepayCard
                  pool={pool}
                  token={null}
                  debtUsd={context.currentDebtUsd}
                  amount={amountInput}
                  preview={repayPreview!}
                  submitLabel="Review repayment"
                  flatHero
                  onOpenPoolDialog={() => {}}
                  onAmountChange={setAmountInput}
                  onSetMax={() => setAmountInput(context.currentDebtUsd.toFixed(0))}
                  onSubmit={() => {
                    void startReviewFlow()
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <BorrowActionBox
            stage={actionBox.stage}
            actionLabel={isRemove ? "removal" : "repayment"}
            amountLabel={isRemove ? `${percent}%` : `${safeAmountUsd.toFixed(0)} USDC`}
            title={isRemove ? "Removal successful" : "Repayment successful"}
            subtitle={isRemove ? "Removal completed." : "Repayment completed."}
            previewUi={actionBox.previewUi}
            successUi={actionBox.successUi}
            simulated
            isPending={borrowSession.isPending}
            primaryLabel={primaryLabel}
            onPrimary={() => {
              void handlePrimary()
            }}
            onBack={() => {
              setFlowStarted(false)
              actionBox.reset()
            }}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

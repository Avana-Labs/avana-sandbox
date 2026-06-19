"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatFixed, parseFixed } from "@/app/lib/credit-engine"
import { BorrowActionBox } from "@/app/borrow/components/borrow-action-box"
import { buildHomeBorrowPreview } from "@/app/lib/borrow-system/modal-preview-runtime"
import type { BorrowModalSession } from "@/app/lib/borrow-system/modal-session"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  HOME_BORROW_TOKENS,
  HOME_COLLATERAL_POOLS,
  type HomeBorrowToken,
  type HomeCollateralPool,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import { HomeBorrowPanel } from "@/app/components/home-borrow-panel"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"

export type BorrowModalContext = {
  pool: HomeCollateralPool
  currentDebtUsd: number
  defaultTokenId?: string
  tokenOptions?: HomeBorrowToken[]
}

export type BorrowModalResult = {
  pool: HomeCollateralPool
  token: HomeBorrowToken
  amountUsd: number
  healthFactorBefore: number | null
  healthFactorAfter: number | null
  remainingBorrowPowerUsd: number
  receiptHash?: string
}

type BorrowModalProps = {
  open: boolean
  context: BorrowModalContext | null
  borrowSession: BorrowModalSession
  walletId: string
  initialAmount?: string
  initialTokenId?: string | null
  startStage?: "entry" | "review"
  onClose: () => void
  onConfirm: (result: BorrowModalResult) => void
}

export function BorrowModal({
  open,
  context,
  borrowSession,
  walletId,
  initialAmount,
  initialTokenId,
  startStage = "entry",
  onClose,
  onConfirm,
}: BorrowModalProps) {
  const actionBox = useBorrowActionBox(borrowSession)
  const [amountInput, setAmountInput] = useState(initialAmount ?? "")
  const [tokenId, setTokenId] = useState(initialTokenId ?? context?.defaultTokenId ?? context?.tokenOptions?.[0]?.id ?? "usdc")
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false)
  const [flowStarted, setFlowStarted] = useState(startStage === "review")
  const [pendingReviewAdvance, setPendingReviewAdvance] = useState(false)
  const tokenOptions = context?.tokenOptions ?? []
  const availableTokens = tokenOptions.length > 0 ? tokenOptions : HOME_BORROW_TOKENS

  useEffect(() => {
    if (open && context) {
      setAmountInput(initialAmount ?? "")
      setTokenId(initialTokenId ?? context.defaultTokenId ?? context.tokenOptions?.[0]?.id ?? "usdc")
      setFlowStarted(startStage === "review")
      setTokenPickerOpen(false)
      actionBox.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when modal opens only
  }, [initialAmount, initialTokenId, open, context, startStage])

  const token = useMemo(
    () => availableTokens.find((candidate) => candidate.id === tokenId) ?? availableTokens[0] ?? null,
    [availableTokens, tokenId],
  )

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const preview = useMemo(() => {
    if (!context || !token) return null
    return buildHomeBorrowPreview(borrowSession.state, walletId, context.pool.id, token.id, safeAmountUsd)
  }, [borrowSession.state, context, safeAmountUsd, token, walletId])

  const pool = context?.pool ?? HOME_COLLATERAL_POOLS[0]

  const handleClose = useCallback(() => {
    if (actionBox.stage === "processing" || borrowSession.isPending) return
    setFlowStarted(false)
    actionBox.reset()
    onClose()
  }, [actionBox, borrowSession.isPending, onClose])

  const startReviewFlow = useCallback(async () => {
    if (!context || !token || !preview?.isValid) return

    await actionBox.prepareAction({
      type: "borrow",
      walletId,
      marketId: context.pool.id,
      assetId: token.id,
      amountUsd6: parseFixed(safeAmountUsd.toFixed(6), 6),
    })
    setFlowStarted(true)
    setPendingReviewAdvance(true)
  }, [actionBox, context, preview?.isValid, safeAmountUsd, token, walletId])

  useEffect(() => {
    if (!pendingReviewAdvance || actionBox.stage !== "preview" || !actionBox.previewUi?.allowed) {
      return
    }

    setPendingReviewAdvance(false)
    void actionBox.advance()
  }, [actionBox, pendingReviewAdvance])

  useEffect(() => {
    if (!open || !context || startStage !== "review" || flowStarted) return
    if (safeAmountUsd <= 0 || !token) return
    void startReviewFlow()
  }, [context, flowStarted, open, safeAmountUsd, startReviewFlow, startStage, token])

  const handlePrimary = useCallback(async () => {
    if (actionBox.stage === "success") {
      const transactionPreview = actionBox.preview
      const healthFactorBefore = transactionPreview?.before.healthFactorWad
      const healthFactorAfter = transactionPreview?.after.healthFactorWad
      onConfirm({
        pool,
        token: token ?? availableTokens[0]!,
        amountUsd: safeAmountUsd,
        healthFactorBefore: healthFactorBefore ? Number.parseFloat(formatFixed(healthFactorBefore, 18)) : null,
        healthFactorAfter: healthFactorAfter ? Number.parseFloat(formatFixed(healthFactorAfter, 18)) : null,
        remainingBorrowPowerUsd: transactionPreview
          ? Number.parseFloat(formatFixed(transactionPreview.after.availableBorrowCapacityUsd6, 6))
          : preview?.remainingBorrowPowerUsd ?? 0,
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
  }, [actionBox, availableTokens, handleClose, onConfirm, pool, preview?.remainingBorrowPowerUsd, safeAmountUsd, token])

  const primaryLabel =
    actionBox.stage === "success"
      ? "Done"
      : actionBox.stage === "approve"
        ? "Approve wallet"
        : actionBox.stage === "review"
          ? "Borrow now"
          : (actionBox.previewUi?.ctaLabel ?? "Continue")

  if (!context || !preview || !token) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        fullScreenOnMobile
        hideMobileHandle
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-radius-md border border-border bg-background p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">Borrow against collateral</DialogTitle>
        {!flowStarted ? (
          <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
              <HomeBorrowPanel
                pool={pool}
                token={token}
                amount={amountInput}
                preview={preview}
                poolReadOnly
                flatHero
                submitLabel="Review borrow"
                onAmountChange={setAmountInput}
                onOpenPoolSheet={() => {}}
                onOpenTokenSheet={() => setTokenPickerOpen(true)}
                onSubmit={() => {
                  void startReviewFlow()
                }}
              />

              <div className="mt-auto pt-3 text-center text-[12px] text-muted-foreground">
                Powered by Aave v4.{" "}
                <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
                  Learn More
                </a>
              </div>
            </div>

            <TokenPickerDialog
              open={tokenPickerOpen}
              onOpenChange={setTokenPickerOpen}
              selectedTokenId={token.id}
              tokens={availableTokens}
              onSelect={(nextTokenId) => {
                setTokenId(nextTokenId)
                setTokenPickerOpen(false)
              }}
            />
          </div>
        ) : (
          <BorrowActionBox
            stage={actionBox.stage}
            actionLabel="borrow"
            amountLabel={`${safeAmountUsd.toFixed(0)} ${token.symbol}`}
            title="Borrow successful"
            subtitle={`Borrow against ${pool.name}.`}
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

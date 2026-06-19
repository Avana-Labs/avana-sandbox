"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { parseFixed } from "@/app/lib/credit-engine"
import { BorrowActionBox } from "@/app/borrow/components/borrow-action-box"
import { buildHomeSupplyPreview } from "@/app/lib/borrow-system/modal-preview-runtime"
import type { BorrowModalSession } from "@/app/lib/borrow-system/modal-session"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatUsdExact, getSpokeById, type BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { TokenBubble } from "./atoms"

export type SupplyCollateralContext = {
  pool: BorrowPoolRow
}

export type SupplyCollateralResult = {
  pool: BorrowPoolRow
  amountUsd: number
  borrowPowerUsd: number
  feesApy: number
  receiptHash?: string
}

type Props = {
  open: boolean
  context: SupplyCollateralContext | null
  borrowSession: BorrowModalSession
  walletId: string
  onClose: () => void
  onConfirm: (result: SupplyCollateralResult) => void
}

export function SupplyCollateralModal({ open, context, borrowSession, walletId, onClose, onConfirm }: Props) {
  const actionBox = useBorrowActionBox(borrowSession)
  const [amountInput, setAmountInput] = useState("")
  const [flowStarted, setFlowStarted] = useState(false)
  const [pendingReviewAdvance, setPendingReviewAdvance] = useState(false)

  useEffect(() => {
    if (open && context) {
      setAmountInput(Math.round(context.pool.collateralExampleUsd).toString())
      setFlowStarted(false)
      setPendingReviewAdvance(false)
      actionBox.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context])

  const pool = context?.pool
  const spoke = getSpokeById(pool?.spoke ?? "uni-v2")
  const parsedAmount = Number.parseFloat(amountInput)
  const positionUsd = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0
  const feesApy = ((pool?.aprMin ?? 0) + (pool?.aprMax ?? 0)) / 2
  const visuals = pool?.visuals ?? []
  const [visualA, visualB] = visuals
  const pairLabel = visualA && visualB ? `${visualA.symbol}/${visualB.symbol} LP` : "LP position"

  const preview = useMemo(() => {
    if (!pool) return null
    return buildHomeSupplyPreview(borrowSession.state, walletId, pool.id, positionUsd)
  }, [borrowSession.state, pool, positionUsd, walletId])

  const handleClose = useCallback(() => {
    if (actionBox.stage === "processing" || borrowSession.isPending) return
    setFlowStarted(false)
    actionBox.reset()
    onClose()
  }, [actionBox, borrowSession.isPending, onClose])

  const startReviewFlow = useCallback(async () => {
    if (!pool || !preview?.isValid) return
    await actionBox.prepareAction({
      type: "supplyCollateral",
      walletId,
      marketId: pool.id,
      amountUsd6: parseFixed(positionUsd.toFixed(6), 6),
    })
    setFlowStarted(true)
    setPendingReviewAdvance(true)
  }, [actionBox, pool, positionUsd, preview?.isValid, walletId])

  useEffect(() => {
    if (!pendingReviewAdvance || actionBox.stage !== "preview" || !actionBox.previewUi?.allowed) return
    setPendingReviewAdvance(false)
    void actionBox.advance()
  }, [actionBox, pendingReviewAdvance])

  const handlePrimary = useCallback(async () => {
    if (actionBox.stage === "success") {
      if (!pool) return
      onConfirm({
        pool,
        amountUsd: positionUsd,
        borrowPowerUsd: preview?.borrowPowerUsd ?? 0,
        feesApy,
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
  }, [actionBox, feesApy, handleClose, onConfirm, pool, positionUsd, preview?.borrowPowerUsd])

  if (!context || !pool || !preview) return null

  const primaryLabel =
    actionBox.stage === "success"
      ? "Done"
      : actionBox.stage === "approve"
        ? "Approve wallet"
        : actionBox.stage === "review"
          ? "Pledge collateral"
          : (actionBox.previewUi?.ctaLabel ?? "Continue")

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        fullScreenOnMobile
        hideMobileHandle
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">Pledge collateral</DialogTitle>
        {!flowStarted ? (
          <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
              <div className="flex min-h-full flex-col gap-2.5">
                <div className="px-1 py-3 md:flex-1 md:min-h-[140px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[hsl(var(--brand))]">You&apos;re pledging</span>
                  </div>
                  <div className="flex min-h-[100px] flex-col items-center justify-center gap-4 py-3 sm:min-h-[120px] md:min-h-[110px] md:flex-1 md:py-0">
                    <label className="w-full max-w-[18rem]">
                      <span className="sr-only">Collateral amount</span>
                      <input
                        inputMode="decimal"
                        value={amountInput}
                        onChange={(event) => setAmountInput(event.target.value)}
                        className="w-full border-0 bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/45"
                        placeholder="0"
                      />
                    </label>
                    <div className="text-[13px] text-muted-foreground">{formatUsdExact(positionUsd)}</div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5">
                    <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                      <div className="relative h-10 w-[3.2rem] shrink-0 md:h-9 md:w-[2.75rem]" aria-hidden>
                        {visualA ? <TokenBubble visual={visualA} size="lg" className="absolute left-0 top-0 ring-2 ring-background md:size-8" /> : null}
                        {visualB ? <TokenBubble visual={visualB} size="lg" className="absolute left-[1.25rem] top-0 ring-2 ring-background md:left-[1.05rem] md:size-8" /> : null}
                      </div>
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">Collateral position</span>
                      <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">{pairLabel}</span>
                    </span>
                    <span />
                  </div>
                  <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5">
                    <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                      <span className="font-compact text-[28px] leading-none text-[hsl(var(--brand))]">$</span>
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">Borrow power</span>
                      <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">{formatUsdExact(preview.borrowPowerUsd)}</span>
                    </span>
                    <span />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={!preview.isValid}
                  className="h-11 rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90 md:shrink-0"
                  onClick={() => {
                    void startReviewFlow()
                  }}
                >
                  Review pledge
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <BorrowActionBox
            stage={actionBox.stage}
            actionLabel="pledging collateral"
            amountLabel={formatUsdExact(positionUsd)}
            title="Collateral pledged"
            subtitle="Collateral is now available for borrowing."
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

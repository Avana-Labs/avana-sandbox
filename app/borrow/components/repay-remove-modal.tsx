"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { HOME_COLLATERAL_POOLS, calculateRemovePreview, calculateRepayPreview, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
import {
  formatUsdExact,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { TokenBubble } from "./atoms"
import { CompactRemoveCard } from "@/app/components/home/remove-card"
import { CompactRepayCard } from "@/app/components/home/repay-card"

type ModalStage = "entry" | TransactionFlowStage

export type RepayRemoveMode = "repay" | "remove"

export type RepayRemoveContext = {
  pool: HomeCollateralPool
  currentDebtUsd: number
  mode: RepayRemoveMode
  borrowApr?: number
}

export type RepayRemoveResult = {
  pool: HomeCollateralPool
  mode: RepayRemoveMode
  amountUsd: number
  percent?: number
  healthFactorAfter: number | null
}

type Props = {
  open: boolean
  context: RepayRemoveContext | null
  onClose: () => void
  onConfirm: (result: RepayRemoveResult) => void
}

export function RepayRemoveModal({ open, context, onClose, onConfirm }: Props) {
  const [amountInput, setAmountInput] = useState("")
  const [percent, setPercent] = useState(25)
  const [stage, setStage] = useState<ModalStage>("entry")

  useEffect(() => {
    if (open && context) {
      setAmountInput("")
      setPercent(25)
      setStage("entry")
    }
  }, [open, context])

  const isRemove = context?.mode === "remove"

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const pool = context?.pool ?? HOME_COLLATERAL_POOLS[0]
  const currentDebtUsd = context?.currentDebtUsd ?? 0

  const repayPreview = useMemo(() => {
    if (!context) return null
    return calculateRepayPreview(context.pool, context.currentDebtUsd, safeAmountUsd, context.borrowApr ?? 5.2)
  }, [context, safeAmountUsd])

  const removePreview = useMemo(() => {
    if (!context) return null
    return calculateRemovePreview(context.pool, context.currentDebtUsd, percent)
  }, [context, percent])
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [
    ReturnType<typeof homeVisualToBorrowVisual>,
    ReturnType<typeof homeVisualToBorrowVisual>,
  ]
  const aaveFooterNote = (
    <>
      Powered by Aave v4.{" "}
      <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
        Learn More
      </a>
    </>
  )

  useEffect(() => {
    if (stage !== "processing") return

    const timer = window.setTimeout(() => {
      if (isRemove && removePreview) {
        onConfirm({
          pool,
          mode: "remove",
          amountUsd: removePreview.removeUsd,
          percent,
          healthFactorAfter: Number.isFinite(removePreview.healthFactorAfter) ? removePreview.healthFactorAfter : null,
        })
      } else if (!isRemove && repayPreview) {
        onConfirm({
          pool,
          mode: "repay",
          amountUsd: safeAmountUsd,
          healthFactorAfter: Number.isFinite(repayPreview.healthFactorAfter ?? NaN) ? (repayPreview.healthFactorAfter ?? null) : null,
        })
      }
      setStage("success")
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [isRemove, onConfirm, percent, pool, removePreview, repayPreview, safeAmountUsd, stage])

  if (!context || (!repayPreview && !removePreview)) return null

  const flowRows = isRemove
    ? [
        { label: "Returned to wallet", value: formatUsdExact(removePreview?.removeUsd ?? 0), tone: "positive" as const },
        { label: "Remaining collateral", value: formatUsdExact(removePreview?.afterCollateralUsd ?? pool.collateralUsd) },
        {
          label: "Health factor",
          value: formatHealthFactor(removePreview?.healthFactorAfter ?? null),
          tone: (removePreview?.isUnsafe ? "danger" : "positive") as "danger" | "positive",
        },
      ]
    : [
        { label: "Current debt", value: formatUsdExact(currentDebtUsd) },
        { label: "Remaining debt", value: formatUsdExact(repayPreview?.remainingDebtUsd ?? currentDebtUsd) },
        {
          label: "Health factor",
          value: `${repayPreview?.oldHealthFactorLabel ?? "—"} -> ${repayPreview?.healthFactorAfterLabel ?? "—"}`,
          tone: "positive" as const,
        },
        { label: "Interest saved / yr", value: formatUsdExact(repayPreview?.yearlyInterestSavedUsd ?? 0), tone: "positive" as const },
      ]

  const handleClose = () => {
    if (stage === "processing") return
    setStage("entry")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        fullScreenOnMobile
        hideMobileHandle
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">{isRemove ? "Remove liquidity" : "Repay debt"}</DialogTitle>
        {stage === "entry" ? (
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
                  onSubmit={() => setStage("review")}
                />
              ) : (
                <CompactRepayCard
                  pool={pool}
                  debtUsd={currentDebtUsd}
                  amount={amountInput}
                  preview={repayPreview!}
                  submitLabel="Review repayment"
                  flatHero
                  onOpenPoolDialog={() => {}}
                  onAmountChange={setAmountInput}
                  onSetMax={() => setAmountInput(currentDebtUsd.toFixed(0))}
                  onSubmit={() => setStage("review")}
                />
              )}

              <div className="mt-auto pt-3 text-center text-[12px] text-muted-foreground">
                {aaveFooterNote}
              </div>
            </div>
          </div>
        ) : (
          <TransactionFlowPanel
            stage={stage as TransactionFlowStage}
            actionLabel={isRemove ? "removal" : "repayment"}
            amountLabel={isRemove ? `${percent}%` : `${formatUsdExact(safeAmountUsd)} USDC`}
            title={isRemove ? "Removal successful" : "Repayment successful"}
            subtitle={
              isRemove ? "Removal completed." : "Repayment completed."
            }
            visual={
              <div className="flex items-center">
                <TokenBubble visual={visuals[0]} size="md" />
                <TokenBubble visual={visuals[1]} size="md" className="-ml-2" />
              </div>
            }
            rows={flowRows}
            note={undefined}
            footerNote={aaveFooterNote}
            primaryLabel={stage === "review" ? (isRemove ? "Remove liquidity" : "Repay now") : stage === "approve" ? "Approve wallet" : "Done"}
            onPrimary={() => {
              if (stage === "review") setStage("approve")
              else if (stage === "approve") setStage("processing")
              else handleClose()
            }}
            onBack={() => setStage("entry")}
            onClose={handleClose}
            className="rounded-none border-0 bg-transparent shadow-none"
            variant="bare"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

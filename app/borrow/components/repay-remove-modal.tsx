"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import {
  HOME_COLLATERAL_POOLS,
  type RemovePreview,
  type RepayPreview,
  formatHealthFactor,
  formatUsdExact,
  homeVisualToBorrowVisual,
  type HomeCollateralPool,
} from "@/app/lib/data/borrow-domain"
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

function buildRepayPreview(pool: HomeCollateralPool, currentDebtUsd: number, amountUsd: number, borrowApr: number): RepayPreview {
  const remainingDebtUsd = Math.max(0, currentDebtUsd - amountUsd)
  const oldHealthFactor = currentDebtUsd > 0 ? pool.liquidationUsd / currentDebtUsd : Number.POSITIVE_INFINITY
  const healthFactorAfter = remainingDebtUsd > 0 ? pool.liquidationUsd / remainingDebtUsd : Number.POSITIVE_INFINITY

  return {
    amountUsd,
    isEmpty: amountUsd <= 0,
    isValid: amountUsd > 0,
    exceedsDebt: amountUsd > currentDebtUsd,
    remainingDebtUsd,
    remainingDebtLabel: formatUsdExact(remainingDebtUsd),
    healthFactorAfter: Number.isFinite(healthFactorAfter) ? healthFactorAfter : null,
    healthFactorAfterLabel: formatHealthFactor(Number.isFinite(healthFactorAfter) ? healthFactorAfter : null),
    oldHealthFactorLabel: formatHealthFactor(Number.isFinite(oldHealthFactor) ? oldHealthFactor : null),
    riskTone: healthFactorAfter < 1.2 ? "danger" : healthFactorAfter < 1.5 ? "warning" : "positive",
    yearlyInterestSavedUsd: amountUsd * (borrowApr / 100),
    ctaLabel: amountUsd <= 0 ? "Enter amount" : "Review repayment",
  }
}

function buildRemovePreview(pool: HomeCollateralPool, currentDebtUsd: number, percent: number): RemovePreview {
  const safePercent = Math.min(100, Math.max(0, percent))
  const removeUsd = pool.collateralUsd * (safePercent / 100)
  const afterCollateralUsd = Math.max(0, pool.collateralUsd - removeUsd)
  const liquidationThresholdAfterUsd =
    pool.collateralUsd > 0 ? (pool.liquidationUsd / pool.collateralUsd) * afterCollateralUsd : 0
  const healthFactorAfter = currentDebtUsd > 0 ? liquidationThresholdAfterUsd / currentDebtUsd : Number.POSITIVE_INFINITY
  const isUnsafe = currentDebtUsd > 0 && healthFactorAfter < 1

  return {
    percent,
    safePercent,
    removeUsd,
    afterCollateralUsd,
    healthFactorAfter: Number.isFinite(healthFactorAfter) ? healthFactorAfter : null,
    healthFactorAfterLabel: formatHealthFactor(Number.isFinite(healthFactorAfter) ? healthFactorAfter : null),
    riskTone: isUnsafe ? "danger" : healthFactorAfter < 1.5 ? "warning" : "positive",
    isUnsafe,
    liquidationThresholdAfterUsd,
    ctaLabel: safePercent <= 0 ? "Select amount" : "Review removal",
  }
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
    return buildRepayPreview(context.pool, context.currentDebtUsd, safeAmountUsd, context.borrowApr ?? 5.2)
  }, [context, safeAmountUsd])

  const removePreview = useMemo(() => {
    if (!context) return null
    return buildRemovePreview(context.pool, context.currentDebtUsd, percent)
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
                  token={null}
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

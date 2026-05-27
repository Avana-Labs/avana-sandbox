"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { HOME_COLLATERAL_POOLS, calculateRepayPreview, formatHealthFactor, type HomeCollateralPool } from "@/app/lib/home-sim"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import {
  formatUsdExact,
  getSpokeById,
  healthFactorToneClass,
  homePoolSpoke,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HfNumber, PillButton, SpokeDot, TokenBubble, TokenPairCell } from "./atoms"

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
    const removeUsd = (pool.collateralUsd * percent) / 100
    const afterCollateral = pool.collateralUsd - removeUsd
    const hf = context.currentDebtUsd > 0 ? (afterCollateral * (pool.maxLtv / 100)) / context.currentDebtUsd : Number.POSITIVE_INFINITY
    const isUnsafe = hf < 1.5
    const liquidationThresholdAfter = afterCollateral * 0.85
    return { removeUsd, afterCollateral, hf, isUnsafe, liquidationThresholdAfter }
  }, [context, percent])

  const spoke = getSpokeById(homePoolSpoke(pool.category))
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [
    ReturnType<typeof homeVisualToBorrowVisual>,
    ReturnType<typeof homeVisualToBorrowVisual>,
  ]

  useEffect(() => {
    if (stage !== "processing") return

    const timer = window.setTimeout(() => {
      if (isRemove && removePreview) {
        onConfirm({
          pool,
          mode: "remove",
          amountUsd: removePreview.removeUsd,
          percent,
          healthFactorAfter: Number.isFinite(removePreview.hf) ? removePreview.hf : null,
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
        { label: "Remaining collateral", value: formatUsdExact(removePreview?.afterCollateral ?? pool.collateralUsd) },
        {
          label: "Health factor",
          value: formatHealthFactor(removePreview?.hf ?? null),
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
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-[13px] font-medium text-foreground">{isRemove ? "Remove liquidity" : "Repay debt"}</span>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="border-b border-border pb-3">
                <div className="flex items-center justify-between gap-3">
                  <TokenPairCell visuals={visuals} name={pool.name} subtitle={pool.venue} size="sm" />
                  <SpokeDot spoke={spoke} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                  <MetricCell label="Collateral" value={formatUsdExact(pool.collateralUsd)} />
                  <MetricCell label="Debt" value={formatUsdExact(currentDebtUsd)} />
                  <MetricCell label="Max LTV" value={`${pool.maxLtv}%`} />
                </dl>
              </div>

              {isRemove ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Remove %</span>
                    <span className="font-data text-[13px] font-medium tabular-nums text-foreground">{percent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={percent}
                    onChange={(event) => setPercent(Number(event.target.value))}
                    className="mt-2 w-full accent-foreground"
                  />
                  <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                  <div className="mt-3 font-data text-[22px] font-medium text-foreground">
                    {formatUsdExact(removePreview?.removeUsd ?? 0)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="repay-amount" className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      You repay
                    </label>
                    <button
                      type="button"
                      onClick={() => setAmountInput(currentDebtUsd.toFixed(0))}
                      className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Max
                    </button>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <input
                      id="repay-amount"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(event) => setAmountInput(sanitizeNumericInput(event.target.value))}
                      placeholder="0"
                      className="flex-1 border-none bg-transparent font-data text-[24px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <span className="text-[12.5px] font-medium text-muted-foreground">USDC</span>
                  </div>
                </div>
              )}

              <dl className="divide-y divide-border border-y border-border">
                {isRemove ? (
                  <>
                    <StatLine label="Collateral after" value={formatUsdExact(removePreview?.afterCollateral ?? pool.collateralUsd)} />
                    <StatLine label="Liq. threshold after" value={formatUsdExact(removePreview?.liquidationThresholdAfter ?? pool.liquidationUsd)} />
                    <StatLine
                      label="Health factor"
                      value={<HfNumber value={formatHealthFactor(removePreview?.hf ?? null)} tone={healthFactorToneClass(removePreview?.hf ?? null)} size="sm" />}
                    />
                  </>
                ) : (
                  <>
                    <StatLine label="Remaining debt" value={formatUsdExact(repayPreview?.remainingDebtUsd ?? currentDebtUsd)} />
                    <StatLine
                      label="Health factor"
                      value={
                        <span className="flex items-center gap-1.5">
                          <HfNumber value={repayPreview?.oldHealthFactorLabel ?? "—"} tone={healthFactorToneClass(currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : null)} size="sm" />
                          <span className="text-muted-foreground">{"->"}</span>
                          <HfNumber value={repayPreview?.healthFactorAfterLabel ?? "—"} tone={healthFactorToneClass(repayPreview?.healthFactorAfter ?? null)} size="sm" />
                        </span>
                      }
                    />
                    <StatLine label="Interest saved" value={formatUsdExact(repayPreview?.yearlyInterestSavedUsd ?? 0)} />
                  </>
                )}
              </dl>

              {isRemove && removePreview?.isUnsafe ? (
                <div className="border-t border-rose-200 pt-3 text-[11.5px] text-rose-700 dark:border-rose-900/50 dark:text-rose-300">
                  Removing {percent}% would push HF to {formatHealthFactor(removePreview.hf)}. Lower the amount before continuing.
                </div>
              ) : null}

              <PillButton
                variant={isRemove ? "primary" : "success"}
                size="md"
                className="w-full"
                disabled={isRemove ? percent === 0 || !!removePreview?.isUnsafe : !!repayPreview?.isEmpty || !!repayPreview?.exceedsDebt}
                onClick={() => setStage("review")}
              >
                {isRemove
                  ? percent === 0
                    ? "Enter a percent"
                    : removePreview?.isUnsafe
                      ? "Health factor too low"
                      : "Review removal"
                  : repayPreview?.isEmpty
                    ? "Enter an amount"
                    : repayPreview?.exceedsDebt
                      ? "Exceeds debt"
                      : "Review repayment"}
              </PillButton>
            </div>
          </>
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
            note={
              "Approve wallet, then wait for confirmation."
            }
            primaryLabel={stage === "review" ? "Continue" : stage === "approve" ? "Approve wallet" : "Done"}
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

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-data text-[12.5px] font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

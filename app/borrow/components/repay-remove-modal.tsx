"use client"

import { useEffect, useMemo, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog"
import {
  calculateRepayPreview,
  formatHealthFactor,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import {
  formatUsdExact,
  getSpokeById,
  healthFactorToneClass,
  homePoolSpoke,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HfNumber, PillButton, SpokeDot, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (open && context) {
      setAmountInput("")
      setPercent(25)
    }
  }, [open, context])

  const isRemove = context?.mode === "remove"

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const repayPreview = useMemo(() => {
    if (!context) return null
    return calculateRepayPreview(context.pool, context.currentDebtUsd, safeAmountUsd, context.borrowApr ?? 5.2)
  }, [context, safeAmountUsd])

  const removePreview = useMemo(() => {
    if (!context) return null
    const pool = context.pool
    const removeUsd = (pool.collateralUsd * percent) / 100
    const afterCollateral = pool.collateralUsd - removeUsd
    const hf = context.currentDebtUsd > 0 ? (afterCollateral * (pool.maxLtv / 100)) / context.currentDebtUsd : Number.POSITIVE_INFINITY
    const isUnsafe = hf < 1.5
    const liquidationThresholdAfter = afterCollateral * 0.85
    return { removeUsd, afterCollateral, hf, isUnsafe, liquidationThresholdAfter }
  }, [context, percent])

  if (!context) return null

  const { pool, currentDebtUsd } = context
  const spoke = getSpokeById(homePoolSpoke(pool.category))
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]

  const title = isRemove ? "Remove liquidity" : "Repay debt"

  const ctaLabel = isRemove
    ? percent === 0
      ? "Enter a percent"
      : removePreview?.isUnsafe
        ? "Health factor too low"
        : `Remove ${percent}%`
    : repayPreview?.isEmpty
      ? "Enter an amount"
      : repayPreview?.exceedsDebt
        ? "Exceeds debt"
        : `Repay ${formatUsdExact(safeAmountUsd)}`

  const ctaDisabled = isRemove
    ? percent === 0 || !!removePreview?.isUnsafe
    : !!repayPreview?.isEmpty || !!repayPreview?.exceedsDebt

  const handleConfirm = () => {
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
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3 duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <DialogTitle className="text-[13px] font-medium text-foreground">{title}</DialogTitle>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="rounded-radius-sm border border-border bg-surface-inset px-3.5 py-3">
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
                    onChange={(event) => setAmountInput(event.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0"
                    className="flex-1 border-none bg-transparent font-data text-[24px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <span className="text-[12.5px] font-medium text-muted-foreground">USDC</span>
                </div>
              </div>
            )}

            {isRemove && removePreview?.isUnsafe ? (
              <div className="rounded-radius-sm border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <div className="font-medium">Health factor too low</div>
                <div className="mt-0.5">Removing {percent}% would push HF to {formatHealthFactor(removePreview.hf)}. Repay debt first or remove less.</div>
              </div>
            ) : null}

            <dl className="divide-y divide-border rounded-radius-sm border border-border bg-surface-inset overflow-hidden">
              {isRemove ? (
                <>
                  <StatLine label="Collateral after" value={formatUsdExact(removePreview?.afterCollateral ?? pool.collateralUsd)} />
                  <StatLine label="Liq. threshold after" value={formatUsdExact(removePreview?.liquidationThresholdAfter ?? pool.liquidationUsd)} />
                  <StatLine
                    label="Health factor"
                    value={
                      <HfNumber
                        value={formatHealthFactor(removePreview?.hf ?? null)}
                        tone={healthFactorToneClass(removePreview?.hf ?? null)}
                        size="sm"
                      />
                    }
                  />
                </>
              ) : (
                <>
                  <StatLine label="Remaining debt" value={formatUsdExact(repayPreview?.remainingDebtUsd ?? currentDebtUsd)} />
                  <StatLine
                    label="Health factor"
                    value={
                      <span className="flex items-center gap-1.5">
                        <HfNumber
                          value={repayPreview?.oldHealthFactorLabel ?? "—"}
                          tone={healthFactorToneClass(
                            currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : null,
                          )}
                          size="sm"
                        />
                        <span className="text-muted-foreground">→</span>
                        <HfNumber
                          value={repayPreview?.healthFactorAfterLabel ?? "—"}
                          tone={healthFactorToneClass(repayPreview?.healthFactorAfter ?? null)}
                          size="sm"
                        />
                      </span>
                    }
                  />
                  <StatLine
                    label="Yearly interest saved"
                    value={
                      <span className="font-data font-medium tabular-nums text-emerald-600">
                        {formatUsdExact(repayPreview?.yearlyInterestSavedUsd ?? 0)}
                      </span>
                    }
                  />
                </>
              )}
            </dl>

            <PillButton
              variant={isRemove ? "primary" : "success"}
              size="md"
              className="w-full"
              disabled={ctaDisabled}
              onClick={handleConfirm}
            >
              {ctaLabel}
            </PillButton>
          </div>
          <DialogClose className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground">
            <span className="sr-only">Close</span>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
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
      <span className={cn("text-right font-medium text-foreground")}>{value}</span>
    </div>
  )
}

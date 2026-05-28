"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import { Button } from "@/components/ui/button"
import {
  formatUsdExact,
  getSpokeById,
  type BorrowPoolRow,
} from "@/app/lib/borrow-sim"
import { TokenBubble } from "./atoms"

type ModalStage = "entry" | TransactionFlowStage

export type SupplyCollateralContext = {
  pool: BorrowPoolRow
}

export type SupplyCollateralResult = {
  pool: BorrowPoolRow
  amountUsd: number
  borrowPowerUsd: number
  feesApy: number
}

type Props = {
  open: boolean
  context: SupplyCollateralContext | null
  onClose: () => void
  onConfirm: (result: SupplyCollateralResult) => void
}

export function SupplyCollateralModal({ open, context, onClose, onConfirm }: Props) {
  const [stage, setStage] = useState<ModalStage>("entry")

  useEffect(() => {
    if (open && context) {
      setStage("entry")
    }
  }, [open, context])

  const pool = context?.pool
  const spoke = getSpokeById(pool?.spoke ?? "uni-v2")
  const positionUsd = pool?.collateralExampleUsd ?? 0
  const borrowPower = positionUsd * ((pool?.ltv ?? 0) / 100)
  const borrowAprEst = spoke.aprApprox
  const feesApy = ((pool?.aprMin ?? 0) + (pool?.aprMax ?? 0)) / 2
  const visuals = pool?.visuals ?? []
  const [visualA, visualB] = visuals
  const pairLabel = visualA && visualB ? `${visualA.symbol}/${visualB.symbol} LP` : "LP position"
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
    if (!pool) return

    const timer = window.setTimeout(() => {
      if (!pool) return
      onConfirm({
        pool,
        amountUsd: positionUsd,
        borrowPowerUsd: borrowPower,
        feesApy,
      })
      setStage("success")
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [borrowPower, feesApy, onConfirm, pool, positionUsd, stage])

  if (!context || !pool) return null

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
        <DialogTitle className="sr-only">Pledge collateral</DialogTitle>
        {stage === "entry" ? (
          <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
              <div className="flex min-h-full flex-col gap-2.5">
                <div className="px-1 py-3 md:flex-1 md:min-h-[140px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[hsl(var(--brand))]">You're pledging</span>
                  </div>

                  <div className="flex min-h-[100px] flex-col items-center justify-center gap-4 py-3 sm:min-h-[120px] md:min-h-[110px] md:flex-1 md:py-0">
                    <div className="font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground">
                      {formatUsdExact(positionUsd)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5">
                    <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                      <PairVisual
                        visuals={pool.visuals}
                        className="h-10 w-[3.2rem] shrink-0 [&>span]:size-10 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.25rem] md:h-9 md:w-[2.75rem] md:[&>span]:size-8 md:[&>span:nth-child(2)]:left-[1.05rem]"
                      />
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
                        Collateral position
                      </span>
                      <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
                        {pairLabel}
                      </span>
                    </span>
                    <span />
                  </div>

                  <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)_1rem] md:gap-2.5 md:px-3.5">
                    <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                      <span className="font-compact text-[28px] leading-none text-[hsl(var(--brand))]">$</span>
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
                        Borrow power
                      </span>
                      <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
                        {formatUsdExact(borrowPower)}
                      </span>
                    </span>
                    <span />
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 gap-2 text-center md:hidden">
                  <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
                    <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">LTV</div>
                    <div className="mt-0.5 font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">{pool.ltv}%</div>
                  </div>
                  <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
                    <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Borrow</div>
                    <div className="mt-0.5 font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">{formatUsdExact(borrowPower)}</div>
                  </div>
                  <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
                    <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">APR</div>
                    <div className="mt-0.5 font-data text-[12.5px] font-medium text-amber-700 dark:text-amber-400">{borrowAprEst.toFixed(1)}%</div>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-11 rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90 md:shrink-0"
                  onClick={() => setStage("review")}
                >
                  Review pledge
                </Button>
                <div className="mt-auto pt-3 text-center text-[12px] text-muted-foreground">
                  {aaveFooterNote}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <TransactionFlowPanel
            stage={stage as TransactionFlowStage}
            actionLabel="pledging collateral"
            amountLabel={formatUsdExact(positionUsd)}
            title="Collateral pledged"
            subtitle="Collateral is now available for borrowing."
              visual={
              <div className="flex items-center">
                {visualA ? <TokenBubble visual={visualA} size="md" /> : null}
                {visualB ? <TokenBubble visual={visualB} size="md" className="-ml-2" /> : null}
              </div>
            }
            rows={[
              { label: "Position", value: `${pairLabel} · ${spoke.label}` },
              { label: "Max LTV", value: `${pool.ltv}%`, tone: "positive" as const },
              { label: "Borrow power", value: formatUsdExact(borrowPower), tone: "positive" as const },
              { label: "LP APY", value: `${feesApy.toFixed(1)}%`, tone: "positive" as const },
            ]}
            note={undefined}
            footerNote={aaveFooterNote}
            primaryLabel={stage === "review" ? "Pledge collateral" : stage === "approve" ? "Approve wallet" : "Done"}
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

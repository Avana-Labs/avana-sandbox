"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import {
  aprToneClass,
  formatUsdExact,
  getSpokeById,
  type BorrowPoolRow,
} from "@/app/lib/borrow-sim"
import { TokenBubble } from "./atoms"
import { cn } from "@/lib/utils"

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

const NETWORK_FEE_USD = 1.2

export function SupplyCollateralModal({ open, context, onClose, onConfirm }: Props) {
  const [stage, setStage] = useState<ModalStage>("entry")

  useEffect(() => {
    if (open && context) {
      setStage("entry")
    }
  }, [open, context])

  const pool = context?.pool ?? ({} as BorrowPoolRow)
  const spoke = getSpokeById(pool.spoke)
  const positionUsd = pool.collateralExampleUsd
  const borrowPower = positionUsd * (pool.ltv / 100)
  const borrowAprEst = spoke.aprApprox
  const riskPremiumPct = pool.riskPremiumBps / 100
  const feesApy = (pool.aprMin + pool.aprMax) / 2
  const pairLabel = `${pool.visuals[0].symbol}/${pool.visuals[1].symbol} LP`

  useEffect(() => {
    if (stage !== "processing") return

    const timer = window.setTimeout(() => {
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

  if (!context) return null

  const handleClose = () => {
    if (stage === "processing") return
    setStage("entry")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">Post as collateral</DialogTitle>
        {stage === "entry" ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-[13px] font-medium tracking-tight text-foreground">Post as collateral</span>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center">
                    <TokenBubble visual={pool.visuals[0]} size="md" />
                    <TokenBubble visual={pool.visuals[1]} size="md" className="-ml-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-foreground">{pairLabel}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {spoke.label} · Max LTV {pool.ltv}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-data text-[17px] font-medium tabular-nums text-foreground">
                    {formatUsdExact(positionUsd)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Your position</div>
                </div>
              </div>

              <dl className="border-y border-border">
                <StatRow label="Max LTV" value={`${pool.ltv}%`} tone="text-emerald-600" />
                <StatRow label="Max Borrow Power" value={formatUsdExact(borrowPower)} tone="text-emerald-600" />
                <StatRow label="Borrow APR (est.)" value={`${borrowAprEst.toFixed(1)}%`} tone={aprToneClass(borrowAprEst)} />
                <StatRow
                  label="Risk Premium"
                  value={`+${riskPremiumPct.toFixed(2)}%`}
                  tone={riskPremiumPct >= 1 ? "text-rose-600" : "text-amber-600"}
                />
                <StatRow label="LP keeps earning" value="Yes · while collateralized" tone="text-emerald-600" />
                <StatRow label="Network fee" value={formatUsdExact(NETWORK_FEE_USD)} />
              </dl>

              <button
                type="button"
                onClick={() => setStage("review")}
                className="w-full rounded-radius-sm bg-accent-primary px-5 py-2.5 text-center text-[13px] font-medium text-accent-primary-foreground shadow-elev-1 transition-colors hover:bg-accent-primary-hover"
              >
                Review collateral post
              </button>
            </div>
          </>
        ) : (
          <TransactionFlowPanel
            stage={stage as TransactionFlowStage}
            actionLabel="collateral post"
            amountLabel={formatUsdExact(positionUsd)}
            title="Collateral posted"
            subtitle="Collateral post completed."
            visual={
              <div className="flex items-center">
                <TokenBubble visual={pool.visuals[0]} size="md" />
                <TokenBubble visual={pool.visuals[1]} size="md" className="-ml-2" />
              </div>
            }
            rows={[
              { label: "Position", value: `${pairLabel} · ${spoke.label}` },
              { label: "Max LTV", value: `${pool.ltv}%`, tone: "positive" as const },
              { label: "Borrow power", value: formatUsdExact(borrowPower), tone: "positive" as const },
              { label: "LP APY", value: `${feesApy.toFixed(1)}%`, tone: "positive" as const },
            ]}
            note="Approve wallet, then wait for confirmation."
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

function StatRow({
  label,
  value,
  tone,
}: {
  label: string
  value: React.ReactNode
  tone?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[12.5px] last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-data font-medium tabular-nums text-foreground", tone)}>{value}</dd>
    </div>
  )
}

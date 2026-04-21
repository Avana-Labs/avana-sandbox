"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog"
import {
  aprToneClass,
  formatUsdExact,
  getSpokeById,
  type BorrowPoolRow,
} from "@/app/lib/borrow-sim"
import { TokenBubble } from "./atoms"
import { cn } from "@/lib/utils"

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
  if (!context) return null

  const { pool } = context
  const spoke = getSpokeById(pool.spoke)
  const positionUsd = pool.collateralExampleUsd
  const borrowPower = positionUsd * (pool.ltv / 100)
  const borrowAprEst = spoke.aprApprox
  const riskPremiumPct = pool.riskPremiumBps / 100
  const feesApy = (pool.aprMin + pool.aprMax) / 2
  const pairLabel = `${pool.visuals[0].symbol}/${pool.visuals[1].symbol} LP`

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-100 bg-white p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
            <DialogTitle className="text-[20px] font-semibold tracking-tight text-slate-900">Post as Collateral</DialogTitle>
            <DialogClose className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700">
              <span className="sr-only">Close</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </DialogClose>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100/80 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <TokenBubble visual={pool.visuals[0]} size="md" />
                  <TokenBubble visual={pool.visuals[1]} size="md" className="-ml-2" />
                </div>
                <div className="min-w-0">
                  <div className="text-[16px] font-semibold text-slate-900">{pairLabel}</div>
                  <div className="text-sm text-slate-500">
                    {spoke.label} · Max LTV {pool.ltv}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-data text-[20px] font-semibold tabular-nums text-slate-900">
                  {formatUsdExact(positionUsd)}
                </div>
                <div className="text-xs text-slate-500">Your position</div>
              </div>
            </div>

            <dl className="overflow-hidden rounded-2xl bg-slate-100/70">
              <StatRow label="Max LTV" value={`${pool.ltv}%`} tone="text-emerald-600" />
              <StatRow label="Max Borrow Power" value={formatUsdExact(borrowPower)} tone="text-emerald-600" />
              <StatRow
                label="Borrow APR (est.)"
                value={`${borrowAprEst.toFixed(1)}%`}
                tone={aprToneClass(borrowAprEst)}
              />
              <StatRow
                label="Risk Premium"
                value={`+${riskPremiumPct.toFixed(2)}%`}
                tone={riskPremiumPct >= 1 ? "text-rose-600" : "text-amber-600"}
              />
              <StatRow
                label="LP keeps earning"
                value={
                  <span className="text-emerald-600">
                    Yes <span className="text-emerald-500/80">· while collateralized</span>
                  </span>
                }
              />
              <StatRow
                label="Network fee"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <BoltIcon className="size-3.5 text-slate-700" />
                    {formatUsdExact(NETWORK_FEE_USD)}
                  </span>
                }
              />
            </dl>

            <button
              type="button"
              onClick={() =>
                onConfirm({
                  pool,
                  amountUsd: positionUsd,
                  borrowPowerUsd: borrowPower,
                  feesApy,
                })
              }
              className="w-full rounded-2xl bg-rose-500 px-5 py-4 text-center text-[16px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(244,63,94,0.6)] transition-colors hover:bg-rose-600"
            >
              Post as Collateral
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
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
    <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 text-sm last:border-b-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className={cn("font-data font-semibold tabular-nums text-slate-900", tone)}>{value}</dd>
    </div>
  )
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path d="M9 1.5L3 9h4l-1 5.5L12 7H8l1-5.5z" fill="currentColor" />
    </svg>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, TrendingUp } from "lucide-react"
import {
  HOME_COLLATERAL_POOLS,
  formatCompactUsd,
  getHealthStatus,
  getPoolById,
  healthGaugePercent,
} from "@/app/lib/home-sim"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { computeHealthFactor } from "./shared"
import type { PoolDialogMode } from "./types"

export function PoolPickerDialog({
  open,
  onOpenChange,
  selectedPoolId,
  onSelect,
  mode,
  debts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPoolId: string
  onSelect: (poolId: string) => void
  mode: PoolDialogMode
  debts: Record<string, number>
}) {
  const [focusedPoolId, setFocusedPoolId] = useState(selectedPoolId)

  useEffect(() => {
    if (open) setFocusedPoolId(selectedPoolId)
  }, [open, selectedPoolId])

  const title = mode === "borrow" ? "Select LP pool" : mode === "repay" ? "Select debt position" : "Select collateral position"

  const focusedPool = useMemo(() => getPoolById(focusedPoolId), [focusedPoolId])
  const focusedDebt = debts[focusedPoolId] ?? 0
  const focusedHf = computeHealthFactor(focusedPool, focusedDebt)
  const focusedStatus = getHealthStatus(focusedHf)
  const gaugePercent = healthGaugePercent(focusedHf)
  const ltvUsedPercent = focusedPool.borrowPowerUsd > 0
    ? Math.min(100, (focusedDebt / focusedPool.borrowPowerUsd) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[640px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:max-w-[440px]">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-[17px] font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1.5 px-5 pb-1 text-[13px] text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Positions</span>
        </div>

        <div className="max-h-[240px] overflow-y-auto">
          {HOME_COLLATERAL_POOLS.map((pool) => {
            const isFocused = pool.id === focusedPoolId
            const debtUsd = debts[pool.id] ?? 0
            const hf = computeHealthFactor(pool, debtUsd)
            const status = getHealthStatus(hf)

            return (
              <button
                key={pool.id}
                type="button"
                onClick={() => setFocusedPoolId(pool.id)}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors",
                  isFocused ? "bg-surface-1" : "hover:bg-surface-1",
                )}
              >
                <PairVisual visuals={pool.visuals} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold text-foreground">{pool.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {pool.venue} · Max LTV {pool.maxLtv}%
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-[15px] font-semibold">
                    {mode === "repay" ? (debtUsd > 0 ? formatCompactUsd(debtUsd) : "No debt") : formatCompactUsd(pool.collateralUsd)}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", status.textClass)}>
                    <span className={cn("inline-block size-1.5 rounded-full", status.dotClass)} />
                    HF {Number.isFinite(hf) ? hf.toFixed(2) : "∞"}
                  </span>
                </div>
                {isFocused ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>

        <div className="mt-2 h-px bg-border" />

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
          <div className="rounded-[20px] border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-data text-[44px] font-bold leading-none tracking-tight text-foreground">
                  {Number.isFinite(focusedHf) ? focusedHf.toFixed(2) : "∞"}
                </div>
                <div className="mt-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Health factor
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-bold tracking-wide", focusedStatus.textClass)}>
                  <span className={cn("inline-block size-2 rounded-full", focusedStatus.dotClass)} />
                  {focusedStatus.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{focusedPool.name}</span>
              </div>
            </div>

            <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full", focusedStatus.barClass)}
                style={{ width: `${gaugePercent}%` }}
              />
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-[0_0_0_2px_rgba(0,0,0,0.08)]"
                style={{ left: `${gaugePercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-data text-[16px] font-bold tracking-tight text-foreground">
                  {ltvUsedPercent.toFixed(0)}%
                </span>
                <span className="text-[12px] text-muted-foreground">borrow power used</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCompactUsd(focusedDebt)}</span>
                <span className="mx-1">/</span>
                <span>{formatCompactUsd(focusedPool.borrowPowerUsd)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <Button
            type="button"
            onClick={() => onSelect(focusedPoolId)}
            className="h-[52px] w-full rounded-[20px] bg-brand text-[17px] font-semibold text-white shadow-none transition-colors hover:bg-brand/90"
          >
            Use {focusedPool.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

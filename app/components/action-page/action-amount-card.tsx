"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ActionAmountCardProps = {
  label: string
  amount: string
  onAmountChange: (value: string) => void
  approxUsdLabel: string
  assetLabel: string
  assetVisual?: ReactNode
  balanceLabel: string
  balanceValue: string
  onMax?: () => void
  footer?: ReactNode
}

export function ActionAmountCard({
  label,
  amount,
  onAmountChange,
  approxUsdLabel,
  assetLabel,
  assetVisual,
  balanceLabel,
  balanceValue,
  onMax,
  footer,
}: ActionAmountCardProps) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-surface-raised" data-testid="action-amount-card">
      <div className="px-4 pb-3 pt-4">
        <div className="text-[13px] text-muted-foreground">{label}</div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{label} amount</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="w-full border-0 bg-transparent p-0 font-compact text-[clamp(2.4rem,8vw,3.5rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none"
              placeholder="0"
            />
          </label>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium"
          >
            {assetVisual}
            <span>{assetLabel}</span>
            <span className="text-muted-foreground">▾</span>
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
          <span>{approxUsdLabel}</span>
          <div className="flex items-center gap-2">
            <span>
              {balanceLabel}: {balanceValue}
            </span>
            {onMax ? (
              <button type="button" className="font-medium text-foreground hover:underline" onClick={onMax}>
                Max
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {footer ? <div className="border-t border-border">{footer}</div> : null}
    </div>
  )
}

export function ActionFooter({
  primaryLabel,
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  primaryDisabled,
  primaryPending,
  className,
}: {
  primaryLabel: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  primaryDisabled?: boolean
  primaryPending?: boolean
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)} data-testid="action-footer">
      <button
        type="button"
        onClick={onSecondary}
        className="h-12 rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
      >
        {secondaryLabel}
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryPending}
        className={cn(
          "h-12 rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          primaryPending && "opacity-70",
        )}
      >
        {primaryPending ? "Processing…" : primaryLabel}
      </button>
    </div>
  )
}

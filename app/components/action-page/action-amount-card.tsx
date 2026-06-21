"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ActionTokenIcon } from "@/app/components/action-page/action-token-icon"

type ActionAmountCardProps = {
  label: string
  amount: string
  onAmountChange: (value: string) => void
  approxUsdLabel: string
  assetLabel: string
  assetSymbol?: string
  balanceLabel: string
  balanceValue: string
  onMax?: () => void
  onPercent?: (percent: number) => void
  showPercentShortcuts?: boolean
  receiveWeth?: boolean
  onReceiveWethChange?: (value: boolean) => void
  showReceiveWethToggle?: boolean
  footer?: ReactNode
}

const PERCENT_PRESETS = [25, 50, 75, 100] as const

export function ActionAmountCard({
  label,
  amount,
  onAmountChange,
  approxUsdLabel,
  assetLabel,
  assetSymbol,
  balanceLabel,
  balanceValue,
  onMax,
  onPercent,
  showPercentShortcuts = false,
  receiveWeth = false,
  onReceiveWethChange,
  showReceiveWethToggle = false,
  footer,
}: ActionAmountCardProps) {
  const symbol = assetSymbol ?? assetLabel.split(" ").slice(-1)[0] ?? "Asset"

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
              className="w-full border-0 bg-transparent p-0 text-[clamp(1.5rem,4vw,2rem)] font-medium leading-none tracking-[-0.04em] text-foreground outline-none"
              placeholder="0"
            />
          </label>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-[14px] font-medium"
          >
            <ActionTokenIcon symbol={symbol} className="size-5" />
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
            {showPercentShortcuts && onPercent ? (
              <div className="flex items-center gap-1">
                {PERCENT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-full px-1.5 py-0.5 text-[12px] font-medium text-foreground hover:bg-muted"
                    onClick={() => onPercent(preset)}
                  >
                    {preset === 100 ? "Max" : `${preset}%`}
                  </button>
                ))}
              </div>
            ) : onMax ? (
              <button type="button" className="font-medium text-foreground hover:underline" onClick={onMax}>
                Max
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showReceiveWethToggle ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[14px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Receive WETH</span>
            <span className="text-[11px] opacity-70" aria-hidden>
              ⓘ
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Receive WETH"
            aria-checked={receiveWeth}
            onClick={() => onReceiveWethChange?.(!receiveWeth)}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              receiveWeth ? "bg-foreground" : "bg-muted",
            )}
          >
            <span className={cn("inline-block size-5 rounded-full bg-background transition-transform", receiveWeth ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
      ) : null}

      {footer ? <div className="border-t border-border">{footer}</div> : null}
    </div>
  )
}

export function ActionFooter({
  primaryLabel,
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  primaryHref,
  secondaryHref,
  primaryDisabled,
  primaryPending,
  className,
}: {
  primaryLabel: string
  secondaryLabel?: string
  onPrimary?: () => void
  onSecondary?: () => void
  primaryHref?: string
  secondaryHref?: string
  primaryDisabled?: boolean
  primaryPending?: boolean
  className?: string
}) {
  const primaryClassName = cn(
    "flex h-12 items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
    primaryPending && "opacity-70",
  )
  const secondaryClassName =
    "flex h-12 items-center justify-center rounded-full border border-border bg-surface-raised text-[15px] font-medium text-foreground transition-colors hover:bg-muted"

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)} data-testid="action-footer">
      {secondaryHref && !onSecondary ? (
        <Link href={secondaryHref} className={secondaryClassName}>
          {secondaryLabel}
        </Link>
      ) : (
        <button type="button" onClick={onSecondary} className={secondaryClassName}>
          {secondaryLabel}
        </button>
      )}
      {primaryHref && !onPrimary ? (
        <Link href={primaryHref} className={primaryClassName}>
          {primaryPending ? "Processing…" : primaryLabel}
        </Link>
      ) : (
        <button type="button" onClick={onPrimary} disabled={primaryDisabled || primaryPending} className={primaryClassName}>
          {primaryPending ? "Processing…" : primaryLabel}
        </button>
      )}
    </div>
  )
}

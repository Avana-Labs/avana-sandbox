"use client"

import { ChevronDown } from "lucide-react"
import {
  calculateBorrowPreview,
  formatCompactUsd,
  type HomeBorrowToken,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"
import { FlashValue } from "@/app/components/ui/live"
import { PickerSurface, PrimaryCardButton } from "./shared"

export function CompactBorrowCard({
  pool,
  token,
  amount,
  preview,
  onAmountChange,
  onOpenPoolDialog,
  onOpenTokenDialog,
  onQuickTokenSelect,
  onSetMax,
  onSubmit,
}: {
  pool: HomeCollateralPool
  token: HomeBorrowToken | null
  amount: string
  preview: ReturnType<typeof calculateBorrowPreview>
  onAmountChange: (value: string) => void
  onOpenPoolDialog: () => void
  onOpenTokenDialog: () => void
  onQuickTokenSelect: (tokenId: string) => void
  onSetMax: () => void
  onSubmit: () => void
}) {
  const hasAmount = Number.parseFloat(amount) > 0
  void onQuickTokenSelect

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col divide-y divide-border rounded-radius-md border border-border bg-surface-raised shadow-elev-1 overflow-hidden">
        <PickerSurface label="Collateral" tier="top" seamless>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{formatCompactUsd(pool.collateralUsd)}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{pool.name}</div>
            </div>
            <button
              type="button"
              onClick={onOpenPoolDialog}
              className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-inset px-2 text-foreground transition-colors hover:bg-surface-hover"
            >
              <PairVisual visuals={pool.visuals} className="w-10" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </PickerSurface>

        <PickerSurface
          label="Borrow"
          tier="bottom"
          seamless
          footer={
            <div className="flex items-center justify-between gap-3">
              <span>
                <FlashValue value={preview.remainingBorrowPowerUsd} goodDirection="up">
                  {formatCompactUsd(preview.remainingBorrowPowerUsd)}
                </FlashValue>{" "}
                available to borrow
              </span>
              <button
                type="button"
                onClick={onSetMax}
                className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                Max
              </button>
            </div>
          }
        >
          <div className="flex items-center justify-between gap-4">
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">Borrow amount</span>
              <input
                aria-label="Borrow amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[28px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <span className="text-[11px] text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            {token ? (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
              >
                <TokenBubble visual={token.visual} className="size-4" />
                {token.symbol}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-7 items-center gap-1 rounded-xs bg-accent-primary px-2.5 text-[12px] font-medium text-accent-primary-foreground transition-colors hover:bg-accent-primary-hover"
              >
                Select token
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </button>
            )}
          </div>
        </PickerSurface>
      </div>

      {preview.warningTitle && preview.warningMessage ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-radius-sm border border-border bg-surface-inset px-3 py-2.5 text-[12px]",
          )}
        >
          <span
            className={cn(
              "mt-1 inline-block size-1.5 shrink-0 rounded-full",
              preview.riskTone === "danger" ? "bg-rose-500" : "bg-amber-500",
            )}
          />
          <span className="text-foreground">
            <strong className={cn("font-medium", preview.riskTone === "danger" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300")}>
              {preview.warningTitle}.
            </strong>{" "}
            <span className="text-muted-foreground">{preview.warningMessage}</span>
          </span>
        </div>
      ) : null}

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center md:hidden">
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">HF</div>
            <FlashValue
              value={preview.healthFactor ?? 99}
              goodDirection="up"
              className="mt-0.5 font-data text-[12.5px] font-medium"
            >
              {preview.healthFactorLabel}
            </FlashValue>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Remaining</div>
            <FlashValue
              value={preview.remainingBorrowPowerUsd}
              goodDirection="up"
              className="mt-0.5 font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400"
            >
              {formatCompactUsd(preview.remainingBorrowPowerUsd)}
            </FlashValue>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Liq. at</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium text-amber-700 dark:text-amber-400">{formatCompactUsd(pool.liquidationUsd)}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

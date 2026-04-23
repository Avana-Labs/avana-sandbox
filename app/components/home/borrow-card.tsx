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
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1 rounded-[20px] border border-border/70 bg-card p-1">
        <PickerSurface label="Collateral" tier="top" seamless>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[28px] font-semibold tracking-tight text-foreground">{formatCompactUsd(pool.collateralUsd)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{pool.name}</div>
            </div>
            <button
              type="button"
              onClick={onOpenPoolDialog}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-foreground transition-colors hover:bg-muted/80"
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
                Available to borrow
              </span>
              <button type="button" onClick={onSetMax} className="font-semibold text-brand transition-opacity hover:opacity-80">
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
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-xs text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            {token ? (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                <TokenBubble visual={token.visual} className="size-5" />
                {token.symbol}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
              >
                Select token
                <ChevronDown className="h-3.5 w-3.5 text-white/85" />
              </button>
            )}
          </div>
        </PickerSurface>
      </div>

      {preview.warningTitle && preview.warningMessage ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            preview.riskTone === "danger"
              ? "border-rose-200 bg-rose-500/10 text-rose-700"
              : "border-amber-200 bg-amber-500/10 text-amber-700",
          )}
        >
          <strong className="font-semibold">{preview.warningTitle}.</strong> {preview.warningMessage}
        </div>
      ) : null}

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center md:hidden">
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF</div>
            <FlashValue
              value={preview.healthFactor ?? 99}
              goodDirection="up"
              className="mt-1 font-data text-sm font-semibold"
            >
              {preview.healthFactorLabel}
            </FlashValue>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Remaining</div>
            <FlashValue
              value={preview.remainingBorrowPowerUsd}
              goodDirection="up"
              className="mt-1 font-data text-sm font-semibold text-emerald-600"
            >
              {formatCompactUsd(preview.remainingBorrowPowerUsd)}
            </FlashValue>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Liq. at</div>
            <div className="mt-1 font-data text-sm font-semibold text-amber-600">{formatCompactUsd(pool.liquidationUsd)}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

"use client"

import { ChevronDown } from "lucide-react"
import {
  HOME_BORROW_TOKENS,
  calculateRepayPreview,
  formatCompactUsd,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { PickerSurface, PrimaryCardButton } from "./shared"

export function CompactRepayCard({
  pool,
  debtUsd,
  amount,
  preview,
  onOpenPoolDialog,
  onAmountChange,
  onSetMax,
  onSubmit,
}: {
  pool: HomeCollateralPool
  debtUsd: number
  amount: string
  preview: ReturnType<typeof calculateRepayPreview>
  onOpenPoolDialog: () => void
  onAmountChange: (value: string) => void
  onSetMax: () => void
  onSubmit: () => void
}) {
  const hasAmount = Number.parseFloat(amount) > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1">
        <PickerSurface label="Loan position" tier="top">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-2xl font-semibold tracking-tight text-foreground">{formatCompactUsd(debtUsd)}</div>
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
          label="Repay"
          tier="bottom"
          footer={
            <div className="flex items-center justify-between gap-3">
              <span>{preview.amountUsd > 0 ? `Interest saved ~${formatCompactUsd(preview.yearlyInterestSavedUsd)} / yr` : "Repay in USDC."}</span>
              <button type="button" onClick={onSetMax} className="font-semibold text-brand transition-opacity hover:opacity-80">
                Max
              </button>
            </div>
          }
        >
          <div className="flex items-center justify-between gap-4">
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">Repay amount</span>
              <input
                aria-label="Repay amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-xs text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            <div className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[15px] font-semibold text-foreground">
              <TokenBubble visual={HOME_BORROW_TOKENS[0].visual} className="size-5" />
              USDC
            </div>
          </div>
        </PickerSurface>
      </div>

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center md:hidden">
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Remaining</div>
            <div className="mt-1 font-data text-sm font-semibold">{preview.remainingDebtLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF after</div>
            <div className="mt-1 font-data text-sm font-semibold text-emerald-600">{preview.healthFactorAfterLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Fee</div>
            <div className="mt-1 font-data text-sm font-semibold">~$0.80</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

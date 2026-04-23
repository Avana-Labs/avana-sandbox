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
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col divide-y divide-border rounded-radius-md border border-border bg-surface-raised shadow-elev-1 overflow-hidden">
        <PickerSurface label="Loan position" tier="top" seamless>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{formatCompactUsd(debtUsd)}</div>
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
          label="Repay"
          tier="bottom"
          seamless
          footer={
            <div className="flex items-center justify-between gap-3">
              <span>{preview.amountUsd > 0 ? `Interest saved ~${formatCompactUsd(preview.yearlyInterestSavedUsd)} / yr` : "Repay in USDC."}</span>
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
              <span className="sr-only">Repay amount</span>
              <input
                aria-label="Repay amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[28px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
              />
              <span className="text-[11px] text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            <div className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-2 text-[12px] font-medium text-foreground">
              <TokenBubble visual={HOME_BORROW_TOKENS[0].visual} className="size-4" />
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
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Remaining</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium">{preview.remainingDebtLabel}</div>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">HF after</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">{preview.healthFactorAfterLabel}</div>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Fee</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium">~$0.80</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

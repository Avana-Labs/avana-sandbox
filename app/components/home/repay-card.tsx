"use client"

import { ChevronDown } from "lucide-react"
import {
  HOME_BORROW_TOKENS,
  calculateRepayPreview,
  formatCompactUsd,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { PrimaryCardButton } from "./shared"

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
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:flex-1 md:min-h-[250px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[hsl(var(--brand))]">You&apos;re repaying</span>
          <button
            type="button"
            onClick={onSetMax}
            className="text-[12px] font-medium text-[hsl(var(--brand))] transition-colors hover:opacity-80"
          >
            Max
          </button>
        </div>

        <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 py-3 sm:min-h-[220px] md:min-h-[150px] md:flex-1 md:py-0">
          <label className="flex w-full justify-center">
            <input
              aria-label="Repay amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              className="no-number-spinner w-[min(100%,12ch)] bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
            />
          </label>
          <div className="text-center text-[12px] text-muted-foreground">
            {amount ? `Interest saved ~${formatCompactUsd(preview.yearlyInterestSavedUsd)} / yr` : `Outstanding debt ${formatCompactUsd(debtUsd)}`}
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenPoolDialog}
          className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left shadow-elev-1 transition-colors hover:bg-surface-inset md:h-[58px] md:grid-cols-[3rem_minmax(0,1fr)_1rem] md:px-3.5"
        >
          <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
            <PairVisual
              visuals={pool.visuals}
              className="h-10 w-[3.2rem] shrink-0 [&>span]:size-10 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.25rem] md:h-9 md:w-[2.75rem] md:[&>span]:size-8 md:[&>span:nth-child(2)]:left-[1.05rem]"
            />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
              Loan position
            </span>
            <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
              {pool.name}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--brand))]" />
        </button>

        <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left shadow-elev-1 md:h-[58px] md:grid-cols-[3rem_minmax(0,1fr)] md:px-3.5">
          <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
            <TokenBubble visual={HOME_BORROW_TOKENS[0].visual} className="size-10 shrink-0 md:size-8" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
              Repay asset
            </span>
            <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
              USDC
            </span>
          </span>
        </div>
      </div>

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

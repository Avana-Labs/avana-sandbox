"use client"

import {
  HOME_CLAIM_POSITIONS,
  calculateClaimPreview,
  formatUsd,
} from "@/app/lib/home-sim"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"
import { PrimaryCardButton } from "./shared"

export function CompactClaimCard({
  amount,
  preview,
  claimableTotals,
  selections,
  onToggleSelection,
  onAmountChange,
  onSetAll,
  onSubmit,
}: {
  amount: string
  preview: ReturnType<typeof calculateClaimPreview>
  claimableTotals: Record<string, number>
  selections: Record<string, boolean>
  onToggleSelection: (positionId: string) => void
  onAmountChange: (value: string) => void
  onSetAll: () => void
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:flex-1 md:min-h-[250px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[hsl(var(--brand))]">You&apos;re claiming</span>
          <button
            type="button"
            onClick={onSetAll}
            className="text-[12px] font-medium text-[hsl(var(--brand))] transition-colors hover:opacity-80"
          >
            All
          </button>
        </div>

        <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 py-3 text-center sm:min-h-[220px] md:min-h-[150px] md:flex-1 md:py-0">
          <label className="flex w-full justify-center">
            <input
              aria-label="Claim amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              className="no-number-spinner w-[min(100%,12ch)] bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
            />
          </label>
          <div className="text-[12px] text-muted-foreground">
            {amount ? preview.helperLabel : `Selected total ${formatUsd(preview.selectedTotalUsd)}`}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {HOME_CLAIM_POSITIONS.map((position) => {
          const isSelected = selections[position.id]

          return (
            <button
              key={position.id}
              type="button"
              onClick={() => onToggleSelection(position.id)}
              className={cn(
                "grid min-h-[70px] grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-radius-md border px-4 text-left shadow-elev-1 transition-colors md:min-h-[58px] md:grid-cols-[3rem_minmax(0,1fr)_auto] md:px-3.5",
                isSelected
                  ? "border-[hsl(var(--brand))]/35 bg-[hsl(var(--brand-soft))]"
                  : "border-border bg-surface-raised hover:bg-surface-inset",
              )}
            >
              <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
                <PairVisual
                  visuals={[position.breakdown[0].visual, position.breakdown[1]?.visual ?? position.breakdown[0].visual]}
                  className="h-10 w-[3.2rem] shrink-0 [&>span]:size-10 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.25rem] md:h-9 md:w-[2.75rem] md:[&>span]:size-8 md:[&>span:nth-child(2)]:left-[1.05rem]"
                />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[16px] font-medium text-foreground md:text-[15px]">
                  {position.name}
                </span>
                <span className="truncate pt-1 text-[12px] text-muted-foreground md:pt-0.5 md:text-[11.5px]">
                  {position.subtitle}
                </span>
              </span>
                <span className="font-compact text-[14px] font-medium text-[hsl(var(--brand))] md:text-[13px]">
                  {formatUsd(claimableTotals[position.id] ?? 0)}
                </span>
            </button>
          )
        })}
      </div>

      <PrimaryCardButton disabled={!preview.hasSelection} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

"use client"

import {
  HOME_CLAIM_POSITIONS,
  calculateClaimPreview,
  formatUsd,
} from "@/app/lib/home-sim"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"
import { PickerSurface, PrimaryCardButton } from "./shared"

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
    <div className="flex flex-col gap-3">
      <div className="rounded-radius-md border border-border bg-surface-raised shadow-elev-1 px-4 py-4 text-foreground">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Total claimable</div>
        <div className="mt-1 font-data text-[20px] font-medium tracking-tight">{formatUsd(preview.selectedTotalUsd)}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        {HOME_CLAIM_POSITIONS.map((position) => {
          const isSelected = selections[position.id]

          return (
            <button
              key={position.id}
              type="button"
              onClick={() => onToggleSelection(position.id)}
              className={cn(
                "flex items-center gap-3 rounded-radius-sm border px-3 py-2.5 text-left transition-colors",
                isSelected
                  ? "border-accent-emphasis/60 bg-accent-emphasis-soft/40 ring-1 ring-accent-emphasis/20"
                  : "border-border bg-surface-raised hover:bg-surface-inset",
              )}
            >
              <PairVisual visuals={[position.breakdown[0].visual, position.breakdown[1]?.visual ?? position.breakdown[0].visual]} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-foreground">{position.name}</span>
                <span className="text-[11.5px] text-muted-foreground">{position.subtitle}</span>
              </div>
              <div className="font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">{formatUsd(claimableTotals[position.id] ?? 0)}</div>
            </button>
          )
        })}
      </div>

      <PickerSurface
        label="Claim amount"
        tier="bottom"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span>{preview.helperLabel}</span>
            <button
              type="button"
              onClick={onSetAll}
              className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              All
            </button>
          </div>
        }
      >
        <div className="flex items-center justify-between gap-4">
          <label className="flex min-w-0 flex-1 flex-col">
            <span className="sr-only">Claim amount</span>
            <input
              aria-label="Claim amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              className="no-number-spinner w-full bg-transparent font-data text-[28px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
            />
          </label>
          <div className="inline-flex h-7 items-center justify-center rounded-xs border border-border bg-surface-raised px-2 text-[12px] font-medium text-foreground">
            USD
          </div>
        </div>
      </PickerSurface>

      <PrimaryCardButton disabled={!preview.hasSelection} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

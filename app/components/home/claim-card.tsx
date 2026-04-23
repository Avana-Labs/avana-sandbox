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
    <div className="flex flex-col gap-2">
      <div className="rounded-[20px] border border-border/70 bg-card px-5 py-5 text-foreground">
        <div className="text-[13px] font-medium text-muted-foreground">Total claimable</div>
        <div className="mt-1 font-data text-[28px] font-semibold tracking-tight">{formatUsd(preview.selectedTotalUsd)}</div>
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
                "flex items-center gap-4 rounded-[20px] border px-4 py-3 text-left transition-colors",
                isSelected
                  ? "border-brand bg-brand-soft"
                  : "border-border/60 bg-muted/40 hover:bg-muted/60",
              )}
            >
              <PairVisual visuals={[position.breakdown[0].visual, position.breakdown[1]?.visual ?? position.breakdown[0].visual]} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-foreground">{position.name}</span>
                <span className="text-xs text-muted-foreground">{position.subtitle}</span>
              </div>
              <div className="font-data text-sm font-semibold text-emerald-600">{formatUsd(claimableTotals[position.id] ?? 0)}</div>
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
            <button type="button" onClick={onSetAll} className="font-semibold text-brand transition-opacity hover:opacity-80">
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
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </label>
          <div className="inline-flex h-8 items-center justify-center rounded-full bg-muted px-3 py-1 text-[15px] font-semibold text-foreground">
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

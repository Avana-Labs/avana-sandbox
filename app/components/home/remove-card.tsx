"use client"

import { ChevronDown } from "lucide-react"
import {
  calculateRemovePreview,
  formatCompactUsd,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { PrimaryCardButton } from "./shared"

export function CompactRemoveCard({
  pool,
  percent,
  preview,
  submitLabel,
  hideSubmitButton = false,
  embedded = false,
  flatHero = false,
  onOpenPoolDialog,
  onPercentChange,
  onSubmit,
}: {
  pool: HomeCollateralPool
  percent: number
  preview: ReturnType<typeof calculateRemovePreview>
  submitLabel?: string
  hideSubmitButton?: boolean
  embedded?: boolean
  flatHero?: boolean
  onOpenPoolDialog: () => void
  onPercentChange: (value: number) => void
  onSubmit: () => void
}) {
  const wrapperClass = embedded
    ? "flex flex-col divide-y divide-border overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-none"
    : "flex flex-col gap-2.5"
  const heroClass = flatHero
    ? "px-1 py-3 md:flex-1 md:min-h-[140px]"
    : embedded
      ? "bg-background px-5 py-4 md:min-h-[250px]"
      : "rounded-radius-md border border-border bg-background px-5 py-4 shadow-elev-1 md:flex-1 md:min-h-[250px]"
  const pickerClass = embedded
    ? "grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 bg-surface-raised px-4 text-left transition-colors hover:bg-surface-inset md:h-[58px] md:grid-cols-[3rem_minmax(0,1fr)_1rem] md:px-3.5"
    : "grid h-[70px] grid-cols-[4rem_minmax(0,1fr)_1rem] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left shadow-elev-1 transition-colors hover:bg-surface-inset md:h-[58px] md:grid-cols-[3rem_minmax(0,1fr)_1rem] md:px-3.5"
  const sliderClass = embedded
    ? "bg-surface-inset px-4 py-4 md:px-3.5 md:py-3.5"
    : "rounded-radius-md border border-border bg-surface-raised px-4 py-4 shadow-elev-1 md:px-3.5 md:py-3.5"

  return (
    <div className={wrapperClass}>
      <div className={heroClass}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[hsl(var(--brand))]">You&apos;re removing</span>
          <span className="text-[12px] text-[hsl(var(--brand))]">Safe max {preview.safePercent}%</span>
        </div>

        <div className={flatHero ? "flex min-h-[100px] flex-col items-center justify-center gap-3 py-3 text-center sm:min-h-[120px] md:min-h-[110px] md:flex-1 md:py-0" : "flex min-h-[150px] flex-col items-center justify-center gap-3 py-3 text-center sm:min-h-[220px] md:min-h-[150px] md:flex-1 md:py-0"}>
          <div className="font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground">
            {percent}%
          </div>
          <div className="text-[12px] text-muted-foreground">
            {percent > 0 ? `${formatCompactUsd(preview.removeUsd)} returned` : "Choose how much collateral to remove"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPoolDialog}
        className={pickerClass}
      >
        <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">
          <PairVisual
            visuals={pool.visuals}
            className="h-10 w-[3.2rem] shrink-0 [&>span]:size-10 [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.25rem] md:h-9 md:w-[2.75rem] md:[&>span]:size-8 md:[&>span:nth-child(2)]:left-[1.05rem]"
          />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
              Collateral position
            </span>
          <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">
            {pool.name}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--brand))]" />
      </button>

      <div className={sliderClass}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">
            Remove amount
          </span>
          <span className="font-compact text-[18px] font-medium text-foreground md:text-[16px]">
            {preview.healthFactorAfterLabel}
          </span>
        </div>

        <div className="mt-3">
          <Slider
            value={[percent]}
            onValueChange={(value) => onPercentChange(value[0] ?? 0)}
            max={100}
            step={1}
            aria-label="Remove collateral percentage"
          />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[25, 50, 75, 100].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPercentChange(preset)}
              className={cn(
                "rounded-radius-sm border px-2 py-1.5 text-[12px] font-medium transition-colors",
                percent === preset
                  ? "border-[hsl(var(--brand))]/30 bg-[hsl(var(--brand-soft))] text-[hsl(var(--brand))]"
                  : "border-border/50 bg-transparent text-muted-foreground hover:border-[hsl(var(--brand))]/30 hover:text-[hsl(var(--brand))]",
              )}
            >
              {preset}%
            </button>
          ))}
        </div>

        {preview.isUnsafe ? (
          <div className="mt-3 text-[12px] text-rose-700 dark:text-rose-300">
            Liquidation risk. Repay debt first before removing this much.
          </div>
        ) : (
          <div className="mt-3 text-[12px] text-muted-foreground">
            Remaining collateral {formatCompactUsd(preview.afterCollateralUsd)}
          </div>
        )}
      </div>

      {!hideSubmitButton ? (
        <PrimaryCardButton disabled={preview.isUnsafe} onClick={onSubmit}>
          {submitLabel ?? preview.ctaLabel}
        </PrimaryCardButton>
      ) : null}
    </div>
  )
}

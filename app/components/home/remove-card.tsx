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
import { PickerSurface, PrimaryCardButton } from "./shared"

export function CompactRemoveCard({
  pool,
  percent,
  preview,
  onOpenPoolDialog,
  onPercentChange,
  onSubmit,
}: {
  pool: HomeCollateralPool
  percent: number
  preview: ReturnType<typeof calculateRemovePreview>
  onOpenPoolDialog: () => void
  onPercentChange: (value: number) => void
  onSubmit: () => void
}) {
  const hasAmount = percent > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col divide-y divide-border rounded-radius-md border border-border bg-surface-raised shadow-elev-1 overflow-hidden">
        <PickerSurface label="Remove from" tier="top" seamless>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{pool.name}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">Max safe remove {preview.safePercent}%</div>
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

        <PickerSurface label="Remove amount" tier="bottom" seamless footer={`Health factor after ${preview.healthFactorAfterLabel}`}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-muted-foreground">Percentage</span>
              <span className="font-data text-[22px] font-medium tracking-tight">{percent}%</span>
            </div>
            <Slider
              value={[percent]}
              onValueChange={(value) => onPercentChange(value[0] ?? 0)}
              max={100}
              step={1}
              aria-label="Remove collateral percentage"
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPercentChange(preset)}
                  className={cn(
                    "rounded-xs border px-2 py-1.5 text-[12px] font-medium transition-colors",
                    percent === preset
                      ? "border-border bg-surface-raised text-foreground"
                      : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </PickerSurface>
      </div>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center md:hidden">
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">Receive</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">{formatCompactUsd(preview.removeUsd)}</div>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">After</div>
            <div className="mt-0.5 font-data text-[12.5px] font-medium">{formatCompactUsd(preview.afterCollateralUsd)}</div>
          </div>
          <div className="rounded-radius-sm border border-border bg-surface-raised px-2.5 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground">HF</div>
            <div className={cn("mt-0.5 font-data text-[12.5px] font-medium", preview.isUnsafe ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
              {preview.healthFactorAfterLabel}
            </div>
          </div>
        </div>
      ) : null}

      {preview.isUnsafe ? (
        <div className="flex items-start gap-2 rounded-radius-sm border border-border bg-surface-inset px-3 py-2.5 text-[12px]">
          <span className="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-rose-500" />
          <span>
            <strong className="font-medium text-rose-700 dark:text-rose-300">Liquidation risk.</strong>{" "}
            <span className="text-muted-foreground">Repay debt first before removing this much.</span>
          </span>
        </div>
      ) : null}

      <PrimaryCardButton disabled={preview.isUnsafe} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

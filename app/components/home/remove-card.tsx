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
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1 rounded-[20px] border border-border/70 bg-card p-1">
        <PickerSurface label="Remove from" tier="top" seamless>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[28px] font-semibold tracking-tight text-foreground">{pool.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">Max safe remove {preview.safePercent}%</div>
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

        <PickerSurface label="Remove amount" tier="bottom" seamless footer={`Health factor after ${preview.healthFactorAfterLabel}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Percentage</span>
              <span className="font-data text-3xl font-semibold tracking-tight">{percent}%</span>
            </div>
            <Slider
              value={[percent]}
              onValueChange={(value) => onPercentChange(value[0] ?? 0)}
              max={100}
              step={1}
              aria-label="Remove collateral percentage"
            />
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPercentChange(preset)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                    percent === preset ? "border-border/60 bg-card text-foreground" : "border-transparent bg-transparent text-muted-foreground hover:bg-card/60",
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
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Receive</div>
            <div className="mt-1 font-data text-sm font-semibold text-emerald-600">{formatCompactUsd(preview.removeUsd)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">After</div>
            <div className="mt-1 font-data text-sm font-semibold">{formatCompactUsd(preview.afterCollateralUsd)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF</div>
            <div className={cn("mt-1 font-data text-sm font-semibold", preview.isUnsafe ? "text-rose-600" : "text-amber-600")}>
              {preview.healthFactorAfterLabel}
            </div>
          </div>
        </div>
      ) : null}

      {preview.isUnsafe ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
          <strong className="font-semibold">Liquidation risk.</strong> Repay debt first before removing this much.
        </div>
      ) : null}

      <PrimaryCardButton disabled={preview.isUnsafe} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

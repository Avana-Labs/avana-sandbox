"use client"

import type { HomeCollateralPool, RemovePreview } from "@/app/lib/home-sim"
import { formatCompactUsd } from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DetailList, PairVisual, PremiumPanel, ValueBadge } from "@/app/components/home-workspace-primitives"
import { cn } from "@/lib/utils"

type HomeRemovePanelProps = {
  pools: HomeCollateralPool[]
  selectedPoolId: string
  debts: Record<string, number>
  percent: number
  preview: RemovePreview
  onSelectPool: (poolId: string) => void
  onPercentChange: (value: number) => void
  onPresetChange: (value: string) => void
  onSubmit: () => void
}

const REMOVE_PRESETS = ["25", "50", "75", "100"] as const

export function HomeRemovePanel({
  pools,
  selectedPoolId,
  debts,
  percent,
  preview,
  onSelectPool,
  onPercentChange,
  onPresetChange,
  onSubmit,
}: HomeRemovePanelProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <PremiumPanel
        title="Remove collateral"
        description="LPFI treats this as the riskiest action. Keep the same guardrails, but present them in a tighter premium flow."
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            <strong className="font-semibold">Heads up.</strong> Removing LP reduces collateral and can push the account toward liquidation.
          </div>

          <div className="flex flex-col gap-3">
            {pools.map((pool) => {
              const debtUsd = debts[pool.id] ?? 0
              const isSelected = pool.id === selectedPoolId

              return (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => onSelectPool(pool.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all",
                    isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/60 bg-background/70 hover:border-border",
                  )}
                >
                  <PairVisual visuals={pool.visuals} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold text-foreground">{pool.name}</span>
                    <span className="text-xs text-muted-foreground">{pool.venue}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-data text-sm font-semibold">{formatCompactUsd(pool.collateralUsd)}</span>
                    <ValueBadge label={debtUsd > 0 ? `Debt ${formatCompactUsd(debtUsd)}` : "No debt"} tone={debtUsd > 0 ? "warning" : "default"} />
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-4 rounded-[24px] border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">Remove amount</span>
              <span className="font-data text-3xl font-semibold tracking-tight">{percent}%</span>
            </div>
            <Slider
              value={[percent]}
              onValueChange={(value) => onPercentChange(value[0] ?? 0)}
              max={100}
              step={1}
              aria-label="Remove collateral percentage"
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-data font-semibold text-emerald-600">Max safe: {preview.safePercent}%</span>
              <span>100%</span>
            </div>
            <ToggleGroup
              type="single"
              value={REMOVE_PRESETS.includes(percent.toString() as (typeof REMOVE_PRESETS)[number]) ? percent.toString() : ""}
              onValueChange={(value) => {
                if (value) {
                  onPresetChange(value)
                }
              }}
              variant="outline"
              spacing={2}
              className="w-full justify-stretch"
            >
              {REMOVE_PRESETS.map((preset) => (
                <ToggleGroupItem key={preset} value={preset} className="flex-1 rounded-xl">
                  {preset}%
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button type="button" variant="destructive" className="h-12 rounded-2xl text-base" onClick={onSubmit}>
            {preview.ctaLabel}
          </Button>
        </div>
      </PremiumPanel>

      <div className="flex flex-col gap-5">
        <PremiumPanel title="Before / after" description="Keep LPFI's safety preview, but reframe it with cleaner comparative cards.">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col gap-2 rounded-[24px] border border-border/60 bg-background/70 p-4 text-center">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Before</span>
              <span className="font-data text-2xl font-semibold">{formatCompactUsd(pools.find((pool) => pool.id === selectedPoolId)?.collateralUsd ?? 0)}</span>
              <span className="text-xs text-muted-foreground">Collateral</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground">to</span>
            <div className="flex flex-col gap-2 rounded-[24px] border border-border/60 bg-background/70 p-4 text-center">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">After</span>
              <span
                className={cn(
                  "font-data text-2xl font-semibold",
                  preview.riskTone === "danger" && "text-rose-600",
                  preview.riskTone === "warning" && "text-amber-600",
                )}
              >
                {formatCompactUsd(preview.afterCollateralUsd)}
              </span>
              <span className="text-xs text-muted-foreground">Collateral</span>
            </div>
          </div>
        </PremiumPanel>

        <PremiumPanel title="Removal impact" description="The CTA stays destructive, but this rail explains whether the action is still safe.">
          <div className="flex flex-col gap-4">
            <DetailList
              rows={[
                { label: "You receive", value: formatCompactUsd(preview.removeUsd), tone: "positive" },
                { label: "Health factor after", value: preview.healthFactorAfterLabel, tone: preview.isUnsafe ? "danger" : "warning" },
                { label: "New liquidation threshold", value: formatCompactUsd(preview.liquidationThresholdAfterUsd), tone: "warning" },
                { label: "Network fee", value: "~$1.20" },
              ]}
            />
            {preview.isUnsafe ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                <strong className="font-semibold">Liquidation risk.</strong> This removal exceeds the safe threshold. Repay debt first.
              </div>
            ) : null}
          </div>
        </PremiumPanel>
      </div>
    </div>
  )
}

"use client"

import { useCallback } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { Slider } from "@/components/ui/slider"

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function stepDecimals(step: number) {
  const fraction = String(step).split(".")[1]
  return fraction?.length ?? 0
}

function snapToStep(value: number, min: number, max: number, step: number) {
  const precision = stepDecimals(step)
  const steps = Math.round((value - min) / step)
  const snapped = min + steps * step
  return Number(clamp(snapped, min, max).toFixed(precision))
}

export function ActionLeverageRuler({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 0.1,
  label = "Leverage",
  variant = "card",
}: {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  label?: string
  variant?: "card" | "embedded"
}) {
  const parsed = Number.parseFloat(value)
  const currentValue = Number.isFinite(parsed) ? snapToStep(parsed, min, max, step) : min

  const publishValue = useCallback(
    (next: number) => {
      onChange(String(snapToStep(next, min, max, step)))
    },
    [max, min, onChange, step],
  )

  const ruler = (
    <div data-testid="action-leverage-ruler">
      <div className="text-[14px] font-medium text-muted-foreground">{label}</div>

      <div className={variant === "embedded" ? "mt-3 flex items-center justify-between gap-3" : "mt-4 flex items-center justify-between gap-3"}>
          <button
            type="button"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground"
            onClick={() => publishValue(min)}
          >
            Min
          </button>
          <div
            className="font-data text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-none tracking-[-0.05em] text-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatMultiplier(currentValue)}
          </div>
          <button
            type="button"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground"
            onClick={() => publishValue(max)}
          >
            Max
          </button>
        </div>

      <div className={variant === "embedded" ? "relative mt-4 px-2" : "relative mt-5 px-2"}>
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-0 h-px -translate-y-1/2 bg-border" aria-hidden />
        <Slider
          min={min}
          max={max}
          step={step}
          value={[currentValue]}
          onValueChange={(values) => publishValue(values[0] ?? min)}
          aria-label={`${label} multiplier`}
          className="relative z-20"
        />
      </div>
    </div>
  )

  if (variant === "embedded") return ruler

  return <ActionCard className="p-4">{ruler}</ActionCard>
}

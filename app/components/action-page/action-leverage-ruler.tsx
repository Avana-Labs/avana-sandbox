"use client"

import { useCallback, useMemo } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

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

function tickPositionPct(tick: number, min: number, max: number) {
  if (max <= min) return 0
  return ((tick - min) / (max - min)) * 100
}

export function ActionLeverageRuler({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 0.1,
  label = "Leverage",
}: {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  label?: string
}) {
  const parsed = Number.parseFloat(value)
  const currentValue = Number.isFinite(parsed) ? snapToStep(parsed, min, max, step) : min

  const ticks = useMemo(() => {
    const range = max - min
    const tickStep = range <= 5 ? 1 : range <= 12 ? 2 : 5
    const items: number[] = []
    for (let current = min; current <= max + 1e-9; current += tickStep) {
      items.push(snapToStep(current, min, max, tickStep))
    }
    const last = items[items.length - 1]
    if (last == null || Math.abs(last - max) > 1e-9) {
      items.push(max)
    }
    return items
  }, [max, min])

  const publishValue = useCallback(
    (next: number) => {
      onChange(String(snapToStep(next, min, max, step)))
    },
    [max, min, onChange, step],
  )

  return (
    <ActionCard className="p-4">
      <div data-testid="action-leverage-ruler">
        <div className="text-[13px] font-medium text-muted-foreground">{label}</div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
            className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => publishValue(max)}
          >
            Max
          </button>
        </div>

        <div className="relative mt-5 px-2">
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
          <div className="relative mt-1 h-8">
            {ticks.map((tick) => {
              const isActive = Math.abs(tick - currentValue) < step / 2
              const showLabel = tick === min || tick === max || tick % 5 === 0 || isActive
              const pct = tickPositionPct(tick, min, max)

              return (
                <button
                  key={tick}
                  type="button"
                  aria-label={`Set leverage to ${formatMultiplier(tick)}`}
                  aria-pressed={isActive}
                  onClick={() => publishValue(tick)}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={cn(
                      "text-[10px] tabular-nums leading-none",
                      showLabel ? (isActive ? "font-semibold text-foreground" : "text-muted-foreground") : "text-transparent select-none",
                    )}
                  >
                    {tick}
                  </span>
                  <span className={isActive ? "h-4 w-px bg-foreground" : tick % 1 === 0 ? "h-3 w-px bg-border" : "h-2 w-px bg-border/70"} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ActionCard>
  )
}

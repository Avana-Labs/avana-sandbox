"use client"

import { useCallback, useMemo } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { cn } from "@/lib/utils"

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function ActionLeverageRuler({
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
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
  const currentValue = Number.isFinite(parsed) ? clamp(Math.round(parsed), min, max) : min

  const ticks = useMemo(() => {
    const items: number[] = []
    for (let current = min; current <= max + 1e-9; current += step) {
      items.push(Math.round(current))
    }
    return items
  }, [max, min, step])

  const publishValue = useCallback(
    (next: number) => {
      const clamped = clamp(Math.round(next), min, max)
      onChange(String(clamped))
    },
    [max, min, onChange],
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

        <div className="relative mt-5">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-border" aria-hidden />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            aria-label={`${label} multiplier`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={currentValue}
            aria-valuetext={formatMultiplier(currentValue)}
            onChange={(event) => publishValue(Number(event.target.value))}
            className="relative z-20 h-10 w-full cursor-grab appearance-none bg-transparent active:cursor-grabbing [&::-webkit-slider-runnable-track]:h-10 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-3 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-moz-range-track]:h-10 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-background"
          />
          <div className="mt-1 flex items-end justify-between gap-0.5">
            {ticks.map((tick) => {
              const isActive = tick === currentValue
              const showLabel = tick === min || tick === max || tick % 5 === 0 || isActive
              return (
                <button
                  key={tick}
                  type="button"
                  aria-label={`Set leverage to ${formatMultiplier(tick)}`}
                  aria-pressed={isActive}
                  onClick={() => publishValue(tick)}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
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

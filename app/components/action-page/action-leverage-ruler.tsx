"use client"

import { useCallback } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  const { t } = useTranslation()
  const parsed = Number.parseFloat(value)
  const currentValue = Number.isFinite(parsed) ? snapToStep(parsed, min, max, step) : min
  const fillPct = max > min ? clamp(((currentValue - min) / (max - min)) * 100, 0, 100) : 0

  const publishValue = useCallback(
    (next: number) => {
      onChange(String(snapToStep(next, min, max, step)))
    },
    [max, min, onChange, step],
  )

  const ruler = (
    <div data-testid="action-leverage-ruler">
      <div className="text-[14px] font-medium text-muted-foreground">{t(label)}</div>

      <div className={variant === "embedded" ? "mt-3 flex items-center justify-between gap-3" : "mt-4 flex items-center justify-between gap-3"}>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground"
            onClick={() => publishValue(min)}
          >
            {t("Min")}
          </button>
          <div
            className="font-data text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-none tracking-[-0.05em] text-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatedTextValue text={formatMultiplier(currentValue)} />
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-surface-hover hover:text-foreground"
            onClick={() => publishValue(max)}
          >
            {t("Max")}
          </button>
        </div>

      <div className={variant === "embedded" ? "relative mt-4 px-2" : "relative mt-5 px-2"}>
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-0 h-1.5 -translate-y-1/2 rounded-full bg-border/70" aria-hidden />
        <div
          className="pointer-events-none absolute left-2 top-1/2 z-[5] h-1.5 -translate-y-1/2 rounded-full bg-brand transition-[width] duration-150 ease-out"
          style={{ width: `calc((100% - 1rem) * ${fillPct / 100})` }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-2 top-1/2 z-10 flex -translate-y-1/2 justify-between px-1" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              key={index}
              className={cn("block rounded-full bg-border/80", index === 2 ? "h-3 w-px" : "h-2 w-px")}
            />
          ))}
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[currentValue]}
          onValueChange={(values) => publishValue(values[0] ?? min)}
          aria-label={t("{label} multiplier").replace("{label}", t(label))}
          className="relative z-20 h-7 w-full touch-none appearance-none bg-transparent accent-primary [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:shadow-elev-2 [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-brand [&::-moz-range-thumb]:shadow-elev-2"
        />
      </div>
    </div>
  )

  if (variant === "embedded") return ruler

  return <ActionCard className="p-4">{ruler}</ActionCard>
}

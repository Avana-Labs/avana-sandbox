"use client"

import { useCallback } from "react"
import { ActionCard } from "@/app/components/action-page/action-metrics"
import { AnimatedTextValue } from "@/app/components/action-page/action-live-value"
import { useCurrency } from "@/app/lib/currency/use-currency"
import { useTranslation } from "@/app/lib/i18n/use-translation"
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
  exposureBaseUsd,
  recommendedMax,
}: {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  step?: number
  label?: string
  variant?: "card" | "embedded"
  /**
   * USD value of the position at 1.0x leverage (collateral amount × price). When
   * provided, the two ends render the resulting exposure range in the active
   * currency (base × min … base × max); otherwise they fall back to the leverage
   * bounds themselves (e.g. "1.0x … 10x").
   */
  exposureBaseUsd?: number
  recommendedMax?: number
}) {
  const { t } = useTranslation()
  const { ctx, convert } = useCurrency()
  const parsed = Number.parseFloat(value)
  const currentValue = Number.isFinite(parsed) ? snapToStep(parsed, min, max, step) : min
  const fillPct = max > min ? clamp(((currentValue - min) / (max - min)) * 100, 0, 100) : 0
  // Thumb centre travels within the track's inner width (the px-2 gutter is 0.5rem
  // per side), so the value bubble and endpoint math both key off (100% - 1rem).
  const thumbLeft = `calc(0.5rem + (100% - 1rem) * ${fillPct / 100})`
  const recommendedPct =
    recommendedMax != null && max > min ? clamp(((recommendedMax - min) / (max - min)) * 100, 0, 100) : null

  const formatEndpoint = useCallback(
    (leverage: number) => {
      if (exposureBaseUsd == null) return formatMultiplier(leverage)
      const whole = Math.round(convert(exposureBaseUsd * leverage))
      return `${ctx.symbol}${whole.toLocaleString("en-US")} ${ctx.currency}`
    },
    [convert, ctx.currency, ctx.symbol, exposureBaseUsd],
  )

  const publishValue = useCallback(
    (next: number) => {
      onChange(String(snapToStep(next, min, max, step)))
    },
    [max, min, onChange, step],
  )

  const ruler = (
    <div data-testid="action-leverage-ruler">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[14px] font-medium text-muted-foreground">{t(label)}</div>
        <label className="relative block">
          <span className="sr-only">{t("Custom {label}").replace("{label}", t(label))}</span>
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={t("Custom {label}").replace("{label}", t(label))}
            className="h-9 w-20 rounded-full border border-border bg-background pl-3 pr-7 text-right font-data text-[14px] font-medium tabular-nums text-foreground outline-none focus:border-brand"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground"
          >
            x
          </span>
        </label>
      </div>

      <div className={variant === "embedded" ? "relative mt-9 px-2" : "relative mt-10 px-2"}>
        <div
          className="pointer-events-none absolute inset-x-2 top-1/2 z-0 h-1.5 -translate-y-1/2 rounded-full bg-border/70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-2 top-1/2 z-[5] h-1.5 -translate-y-1/2 rounded-full bg-brand transition-[width] duration-150 ease-out"
          style={{ width: `calc((100% - 1rem) * ${fillPct / 100})` }}
          aria-hidden
        />
        {recommendedPct != null ? (
          <div
            className="pointer-events-none absolute top-1/2 z-10 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-emerald-500"
            style={{ left: `calc(0.5rem + (100% - 1rem) * ${recommendedPct / 100})` }}
            aria-hidden
          />
        ) : null}
        <div
          className="pointer-events-none absolute bottom-[calc(50%+1rem)] z-30 -translate-x-1/2 font-data text-[15px] font-semibold leading-none tracking-[-0.02em] text-foreground transition-[left] duration-150 ease-out"
          style={{ left: thumbLeft }}
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatedTextValue text={formatMultiplier(currentValue)} />
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

      <div className="mt-3 flex items-center justify-between px-1 font-data text-[13px] font-medium text-muted-foreground">
        <span>{formatEndpoint(min)}</span>
        {recommendedMax != null ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {t("Recommended up to {value}").replace("{value}", formatMultiplier(recommendedMax))}
          </span>
        ) : null}
        <span>{formatEndpoint(max)}</span>
      </div>
    </div>
  )

  if (variant === "embedded") return ruler

  return <ActionCard className="p-4">{ruler}</ActionCard>
}

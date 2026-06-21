"use client"

import { ActionCard } from "@/app/components/action-page/action-metrics"

function formatMultiplier(value: number) {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

export function ActionLeverageSelector({
  value,
  onChange,
  options,
  label = "Leverage",
}: {
  value: string
  onChange: (value: string) => void
  options: number[]
  label?: string
}) {
  if (options.length === 0) return null

  const parsed = Number.parseFloat(value)
  const activeValue = Number.isFinite(parsed) ? parsed : null

  return (
    <ActionCard>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="font-data text-[13px] tabular-nums text-foreground">
          {activeValue != null ? formatMultiplier(activeValue) : "—"}
        </span>
      </div>
      <div role="group" aria-label="Leverage options" className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = activeValue != null && Math.abs(activeValue - option) < 1e-9
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(String(option))}
              className={[
                "h-8 rounded-md border px-3 text-[12.5px] font-medium tabular-nums transition-colors",
                isActive
                  ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand-soft))] text-brand-readable"
                  : "border-border bg-surface-raised text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {formatMultiplier(option)}
            </button>
          )
        })}
      </div>
    </ActionCard>
  )
}

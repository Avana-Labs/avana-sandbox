"use client"

import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import {
  HF_ZONES,
  activeHealthFactorZoneIndex,
  healthFactorBarPositionPct,
  healthFactorBarTone,
  healthFactorStatusLabel,
} from "@/app/lib/action-system/health-factor-ui"
import { formatActionHealthFactor } from "@/app/lib/action-system/formatters"

export function HealthFactorPositionBar({
  value,
  className,
  trackClassName = "bg-muted",
  heightClassName = "h-2",
}: {
  value: number | null
  className?: string
  trackClassName?: string
  heightClassName?: string
}) {
  const fillPct = healthFactorBarPositionPct(value)
  const barTone = healthFactorBarTone(value)
  const hasValue = value != null && !Number.isNaN(value) && activeHealthFactorZoneIndex(value) >= 0

  return (
    <div className={cn("relative rounded-full", trackClassName, heightClassName, className)}>
      {hasValue ? (
        <>
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", barTone.fill)}
            style={{ width: `${fillPct}%` }}
            aria-hidden
          />
          <span
            className={cn(
              "absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 bg-background",
              barTone.border,
            )}
            style={{ left: `calc(${fillPct}% - 6px)` }}
            aria-hidden
          />
        </>
      ) : null}
    </div>
  )
}

export function ActionHealthFactorBar({
  value,
  className,
}: {
  value: number | null
  className?: string
}) {
  const status = healthFactorStatusLabel(value)
  const activeZoneIdx = activeHealthFactorZoneIndex(value)
  const label = value == null ? "—" : formatActionHealthFactor(value)

  return (
    <div className={cn("space-y-3", className)} data-testid="action-health-factor-bar">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[14px] text-muted-foreground">
          <Heart
            className={cn(
              "size-3.5",
              status.tone === "positive" && "fill-emerald-500 text-emerald-500",
              status.tone === "warning" && "fill-amber-500 text-amber-500",
              status.tone === "danger" && "fill-rose-500 text-rose-500",
            )}
            aria-hidden
          />
          <span>Health factor</span>
          <ActionMetricHelp
            topic="health factor"
            text="Health factor estimates how far your position is from liquidation. Above 1.0 is solvent; below 1.0 can be liquidated."
          />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-surface-inset px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            status.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            status.tone === "warning" && "text-amber-600 dark:text-amber-400",
            status.tone === "danger" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="font-data text-[20px] font-semibold leading-none tracking-tight text-foreground">{label}</div>

      <HealthFactorPositionBar value={value} className="mt-1" />

      <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
        {HF_ZONES.map((zone, index) => (
          <span key={zone.id} className={cn("inline-flex items-center gap-1.5", index === activeZoneIdx && "text-foreground")}>
            <span className={cn("size-2 rounded-full", index === activeZoneIdx ? zone.color : "bg-muted-foreground/50")} />
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  )
}

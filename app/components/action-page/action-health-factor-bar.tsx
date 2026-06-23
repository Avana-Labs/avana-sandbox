"use client"

import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { ActionMetricHelp } from "@/app/components/action-page/action-metric-help"
import {
  HF_ZONES,
  activeHealthFactorZoneIndex,
  healthFactorStatusLabel,
} from "@/app/lib/action-system/health-factor-ui"
import { formatActionHealthFactor } from "@/app/lib/action-system/formatters"

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
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
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
          <ActionMetricHelp text="Health factor estimates how far your position is from liquidation. Above 1.0 is solvent; below 1.0 can be liquidated." />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            status.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
            status.tone === "warning" && "text-amber-600 dark:text-amber-400",
            status.tone === "danger" && "text-rose-600 dark:text-rose-400",
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="font-data text-[18px] font-semibold leading-none tracking-tight">{label}</div>

      <div className="flex h-2 w-full items-stretch gap-1">
        {HF_ZONES.map((zone, index) => (
          <div
            key={zone.id}
            className={cn("rounded-full transition-colors", index === activeZoneIdx ? zone.color : "bg-muted")}
            style={{ width: `${zone.widthPct}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
        {HF_ZONES.map((zone, index) => (
          <span key={zone.id} className={cn("inline-flex items-center gap-1", index === activeZoneIdx && "text-foreground")}>
            <span className={cn("size-1.5 rounded-full", index === activeZoneIdx ? zone.color : "bg-muted-foreground/40")} />
            {zone.label}
          </span>
        ))}
      </div>
    </div>
  )
}

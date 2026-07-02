"use client"

import type { EngagementTrend } from "@/app/lib/borrow-detail"
import { cn } from "@/lib/utils"
import { LightweightChart } from "./lw"

type Props = {
  engagement: EngagementTrend
  /** Optional token/pool class used to tint the chart accent. */
  accentClassName?: string | string[]
  /** Override the card title if the mock title isn't what you want. */
  title?: string
  className?: string
}

export function EngagementTrendsCard({ engagement, accentClassName, title, className }: Props) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="min-w-0 text-[21px] font-normal leading-none tracking-[-0.02em] text-brand-readable">
          {title ?? engagement.title}
        </h2>
      </div>

      <p className="mt-3 max-w-[36rem] text-[13px] leading-5 text-muted-foreground">
        Active wallets track unique wallets with activity over the last 30 days.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-3">
        <EngagementKpi kpi={engagement.primary} />
        <EngagementKpi kpi={engagement.secondary} />
      </div>

      <div className="relative mt-5">
        {engagement.series.points.length > 0 ? (
          <LightweightChart
            series={engagement.series}
            height={280}
            accentClassName={accentClassName}
            ariaLabel="Daily engagement"
            formatValue={(v) => v.toLocaleString()}
          />
        ) : (
          <div className="grid h-[240px] place-items-center text-sm text-muted-foreground">No engagement data available.</div>
        )}
      </div>
    </section>
  )
}

/** A single engagement KPI (active wallets / conversion) with a direction-tinted delta. */
function EngagementKpi({ kpi }: { kpi: EngagementTrend["primary"] }) {
  const tone =
    kpi.delta.direction === "up"
      ? "text-success"
      : kpi.delta.direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{kpi.label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-data text-[20px] font-medium tabular-nums text-foreground">{kpi.valueLabel}</span>
        <span className={cn("text-[12px] font-medium tabular-nums", tone)}>{kpi.delta.label}</span>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { LightweightChart } from "@/app/borrow/_detail/ui/lw"
import { SectionCard } from "@/app/borrow/_detail/ui/SectionCard"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { cn } from "@/lib/utils"

export type MetricTrendView = "supplied" | "borrowed" | "utilization"

const DEFAULT_VIEW_LABEL: Record<MetricTrendView, string> = {
  supplied: "Supplied",
  borrowed: "Borrowed",
  utilization: "Utilization",
}

type MetricTrendPoint = {
  time: number
  value: number
}

type MetricTrendCardProps = {
  id?: string
  title: string
  subtitle: string
  seriesByView: Record<MetricTrendView, MetricTrendPoint[]>
  accentClassNameByView?: Partial<Record<MetricTrendView, string>>
  toneByView?: Partial<Record<MetricTrendView, "neutral" | "positive" | "negative">>
  formatValue: (view: MetricTrendView, value: number) => string
  viewLabel?: Partial<Record<MetricTrendView, string>>
  className?: string
}

export function MetricTrendCard({
  id,
  title,
  subtitle,
  seriesByView,
  accentClassNameByView,
  toneByView,
  formatValue,
  viewLabel,
  className,
}: MetricTrendCardProps) {
  const { t } = useTranslation()
  const [view, setView] = React.useState<MetricTrendView>("supplied")
  const labels = { ...DEFAULT_VIEW_LABEL, ...viewLabel }
  const series = seriesByView[view]
  const tone = toneByView?.[view] ?? (view === "borrowed" ? "negative" : "neutral")

  return (
    <section id={id} className={cn("min-w-0", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-ui-heading font-normal leading-none tracking-[-0.02em] text-brand-readable">{t(title)}</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t(subtitle)}</p>
        </div>
        <div role="tablist" className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface-inset p-0.5">
          {(Object.keys(DEFAULT_VIEW_LABEL) as MetricTrendView[]).map((entry) => (
            <button
              key={entry}
              role="tab"
              aria-selected={view === entry}
              type="button"
              onClick={() => setView(entry)}
              className={cn(
                "h-6 rounded-xs px-2 text-[11px] font-medium tabular-nums transition-colors",
                view === entry ? "bg-surface-raised text-foreground shadow-elev-1" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(labels[entry])}
            </button>
          ))}
        </div>
      </div>

      <SectionCard chrome="plain" bodyClassName="p-0">
        <div className="w-full pt-4">
          <LightweightChart
            series={series}
            type="area"
            height={240}
            tone={tone}
            accentClassName={accentClassNameByView?.[view]}
            ariaLabel={t("{view} over time").replace("{view}", t(labels[view]))}
            formatValue={(value) => formatValue(view, value)}
          />
        </div>
      </SectionCard>
    </section>
  )
}

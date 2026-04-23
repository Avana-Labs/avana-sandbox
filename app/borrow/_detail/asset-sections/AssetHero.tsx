"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AssetChartMetricId, AssetDetail, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { RangeTabs, LightweightChart } from "../ui"
import { labelForAssetMetric } from "../lib/selectors"

type Props = {
  detail: AssetDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

const ALL_METRICS: AssetChartMetricId[] = ["supply", "borrow", "utilization", "apy"]
const BAR_METRICS: ReadonlySet<AssetChartMetricId> = new Set<AssetChartMetricId>(["borrow"])

export function AssetHeroIdentity({
  detail,
  leading,
  actions,
  className,
}: {
  detail: AssetDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <span
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-full border-2 border-background ring-1 ring-border/40",
            detail.hero.visual.bgClass,
            detail.hero.visual.textClass,
          )}
          aria-label={detail.hero.symbol}
        >
          {detail.hero.visual.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.hero.visual.iconUrl} alt="" className="size-7 rounded-full" />
          ) : (
            <span className="text-sm font-semibold">{detail.hero.visual.shortLabel}</span>
          )}
        </span>
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="truncate text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground md:text-[1.8rem]">
            {detail.hero.name}
          </h1>
          <span className="text-[15px] font-medium text-muted-foreground">
            {detail.hero.symbol}
          </span>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  )
}

export function AssetHero({ detail, leading, actions, className, hideIdentity = false }: Props) {
  const [metric, setMetric] = React.useState<AssetChartMetricId>(detail.heroMetric.metricId)
  const [range, setRange] = React.useState<TimeRangeId>("1M")
  const [chartType, setChartType] = React.useState<"area" | "bar">("area")

  React.useEffect(() => {
    setChartType(BAR_METRICS.has(metric) ? "bar" : "area")
  }, [metric])

  const series = detail.heroMetric.series[metric][range]
  const points = series.points
  const last = points[points.length - 1]?.v ?? 0
  const first = points[0]?.v ?? last
  const absChange = last - first
  const isPct = metric === "apy" || metric === "utilization"
  const formatValue = React.useCallback(
    (v: number) => (isPct ? formatPct(v, 2) : formatCompactUsd(v)),
    [isPct],
  )
  const valueLabel = formatValue(last)

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="asset-hero">
      {hideIdentity ? null : (
        <AssetHeroIdentity detail={detail} leading={leading} actions={actions} />
      )}

      {/* ── 2. Chart card with overlayed value + delta ── */}
      <Card
        className="relative overflow-hidden border-border/40 bg-card/50 shadow-none"
        data-testid="asset-hero-chart-card"
      >
        <CardContent className="relative p-0">
          <div className="h-[340px] w-full md:h-[380px]">
            <LightweightChart
              series={series}
              type={chartType}
              height={380}
              accentClassName={detail.hero.visual.textClass}
              ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
              formatValue={formatValue}
            />
          </div>
          <div className="pointer-events-none absolute left-6 top-6 z-[2]">
            <div className="font-data text-[1.35rem] font-normal leading-none tabular-nums text-foreground md:text-[1.55rem]">
              {valueLabel}
            </div>
            <InlineDelta
              pct={detail.heroMetric.delta.value}
              abs={absChange}
              formatAbs={formatValue}
              isPct={isPct}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Controls BELOW chart ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeTabs value={range} onChange={setRange} />
        <MetricTextTabs metrics={ALL_METRICS} value={metric} onChange={setMetric} />
      </div>
    </section>
  )
}

function MetricTextTabs({
  metrics,
  value,
  onChange,
}: {
  metrics: AssetChartMetricId[]
  value: AssetChartMetricId
  onChange: (v: AssetChartMetricId) => void
}) {
  return (
    <div role="tablist" aria-label="Chart metric" className="inline-flex items-center gap-4">
      {metrics.map((m) => {
        const active = m === value
        return (
          <button
            key={m}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "text-[13px] tabular-nums transition-colors",
              active
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {labelForAssetMetric(m)}
          </button>
        )
      })}
    </div>
  )
}

function InlineDelta({
  pct,
  abs,
  formatAbs,
  isPct,
}: {
  pct: number
  abs: number
  formatAbs: (v: number) => string
  isPct: boolean
}) {
  const direction = pct > 0.005 ? "up" : pct < -0.005 ? "down" : "flat"
  const color =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•"
  const absLabel = !isPct && Number.isFinite(abs) ? formatAbs(Math.abs(abs)) : null
  return (
    <div className={cn("mt-1 inline-flex items-center gap-1.5 text-xs font-medium tabular-nums md:text-sm", color)}>
      <span aria-hidden className="text-[10px]">{arrow}</span>
      {absLabel ? <span>{absLabel}</span> : null}
      <span className="text-muted-foreground">({Math.abs(pct).toFixed(2)}%)</span>
    </div>
  )
}


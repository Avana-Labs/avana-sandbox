"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AssetChartMetricId, AssetDetail, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart } from "../ui"
import { labelForAssetMetric } from "../lib/selectors"

type Props = {
  detail: AssetDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

const BAR_METRICS: ReadonlySet<AssetChartMetricId> = new Set<AssetChartMetricId>(["borrow"])
const RANGE_OPTIONS: Array<{ value: TimeRangeId; label: string }> = [
  { value: "1D", label: "24H" },
  { value: "1W", label: "7D" },
  { value: "1M", label: "30D" },
  { value: "3M", label: "90D" },
  { value: "1Y", label: "1Y" },
]

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
            "inline-flex size-9 items-center justify-center rounded-full border-2 border-background ring-1 ring-border",
            detail.hero.visual.bgClass,
            detail.hero.visual.textClass,
          )}
          aria-label={detail.hero.symbol}
        >
          {detail.hero.visual.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.hero.visual.iconUrl} alt="" className="size-6 rounded-full" />
          ) : (
            <span className="text-[12px] font-medium">{detail.hero.visual.shortLabel}</span>
          )}
        </span>
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="truncate text-[20px] font-medium leading-tight tracking-tight text-foreground md:text-[24px]">
            {detail.hero.name}
          </h1>
          <span className="text-[12.5px] font-medium text-muted-foreground">
            {detail.hero.symbol}
          </span>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </div>
  )
}

export function AssetHero({ detail, leading, actions, className, hideIdentity = false }: Props) {
  const metric = detail.heroMetric.metricId
  const [range, setRange] = React.useState<TimeRangeId>("1W")
  const chartType: "line" | "bar" = BAR_METRICS.has(metric) ? "bar" : "line"

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
  const valueLabel = detail.heroMetric.valueLabel

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="asset-hero">
      {hideIdentity ? null : (
        <AssetHeroIdentity detail={detail} leading={leading} actions={actions} />
      )}

      {/* ── 2. Chart card with overlayed value + delta ── */}
      <Card
        className="relative overflow-hidden border-border/40 bg-background/70 shadow-none"
        data-testid="asset-hero-chart-card"
      >
        <CardContent className="relative p-0">
          <div className="h-[380px] w-full md:h-[460px]">
            <LightweightChart
              series={series}
              type={chartType}
              height={460}
              accentClassName={detail.hero.visual.textClass}
              ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
              formatValue={formatValue}
              showLastLabel
            />
          </div>
          <div className="pointer-events-none absolute left-5 top-5 z-[2]">
            <div className="font-data text-[20px] font-medium leading-none tabular-nums text-foreground md:text-[22px]">
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
        <div role="tablist" aria-label="Time range" className="inline-flex items-center rounded-full bg-surface-inset p-1">
          {RANGE_OPTIONS.map((option) => {
            const active = option.value === range
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(option.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </section>
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

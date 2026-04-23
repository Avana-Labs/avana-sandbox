"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PoolDetail, ChartMetricId, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { RangeTabs, LightweightChart } from "../ui"
import { labelForPoolMetric } from "../lib/selectors"

type PoolHeroProps = {
  detail: PoolDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

const ALL_METRICS: ChartMetricId[] = ["tvl", "volume", "fees", "price"]
const BAR_METRICS: ReadonlySet<ChartMetricId> = new Set<ChartMetricId>(["volume", "fees"])

export function PoolHeroIdentity({
  detail,
  leading,
  actions,
  className,
}: {
  detail: PoolDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="flex -space-x-2">
          <TokenAvatar visual={detail.hero.visuals[0]} />
          <TokenAvatar visual={detail.hero.visuals[1]} />
        </div>
        <h1 className="truncate text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground md:text-[1.8rem]">
          {detail.hero.name}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {detail.hero.explorerUrl ? (
          <IconButton
            aria-label="Open in block explorer"
            href={detail.hero.explorerUrl}
            icon={<ExternalLinkIcon />}
          />
        ) : null}
        {actions}
      </div>
    </div>
  )
}

export function PoolHero({ detail, leading, actions, className, hideIdentity = false }: PoolHeroProps) {
  const [metric, setMetric] = React.useState<ChartMetricId>(detail.heroMetric.metricId)
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
  const pctChange = detail.heroMetric.delta.value
  const formatValue = React.useCallback(
    (v: number) => (metric === "price" ? formatPrice(v) : formatCompactUsd(v)),
    [metric],
  )
  const valueLabel = formatValue(last)

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="pool-hero">
      {hideIdentity ? null : (
        <PoolHeroIdentity detail={detail} leading={leading} actions={actions} />
      )}

      {/* ── 2. Chart card with overlayed value + delta ── */}
      <Card
        className="relative overflow-hidden border-border/40 bg-card/50 shadow-none"
        data-testid="pool-hero-chart-card"
      >
        <CardContent className="relative p-0">
          <div className="h-[340px] w-full md:h-[380px]">
            <LightweightChart
              series={series}
              type={chartType}
              height={380}
              accentClassName={detail.hero.visuals.map((visual) => visual.textClass)}
              ariaLabel={`${labelForPoolMetric(metric)} over ${range}`}
              formatValue={formatValue}
            />
          </div>
          <div className="pointer-events-none absolute left-6 top-6 z-[2]">
            <div className="font-data text-[1.35rem] font-normal leading-none tabular-nums text-foreground md:text-[1.55rem]">
              {valueLabel}
            </div>
            <InlineDelta
              pct={pctChange}
              abs={absChange}
              formatAbs={metric === "price" ? formatPrice : formatCompactUsd}
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
  metrics: ChartMetricId[]
  value: ChartMetricId
  onChange: (v: ChartMetricId) => void
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
            {labelForPoolMetric(m)}
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
}: {
  pct: number
  abs: number
  formatAbs: (v: number) => string
}) {
  const direction = pct > 0.005 ? "up" : pct < -0.005 ? "down" : "flat"
  const color =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground"
  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "•"
  const absLabel = Number.isFinite(abs) ? formatAbs(Math.abs(abs)) : null
  return (
    <div className={cn("mt-1 inline-flex items-center gap-1.5 text-xs font-medium tabular-nums md:text-sm", color)}>
      <span aria-hidden className="text-[10px]">{arrow}</span>
      {absLabel ? <span>{absLabel}</span> : null}
      <span className="text-muted-foreground">({Math.abs(pct).toFixed(2)}%)</span>
    </div>
  )
}

function IconButton({
  icon,
  onClick,
  href,
  ...rest
}: {
  icon: React.ReactNode
  onClick?: () => void
  href?: string
  "aria-label": string
}) {
  const className =
    "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} {...rest}>
        {icon}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={className} {...rest}>
      {icon}
    </button>
  )
}

function ExternalLinkIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TokenAvatar({ visual }: { visual: PoolDetail["hero"]["visuals"][number] }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border-2 border-background ring-1 ring-border/40",
        visual.bgClass,
        visual.textClass,
      )}
      aria-label={visual.symbol}
    >
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-7 rounded-full" />
      ) : (
        <span className="text-sm font-semibold">{visual.shortLabel}</span>
      )}
    </span>
  )
}

function formatPrice(v: number): string {
  if (v >= 100) return `$${v.toFixed(2)}`
  if (v >= 1) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

void formatPct

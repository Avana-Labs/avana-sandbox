"use client"

import * as React from "react"
import { BadgeCheck, Copy, Globe, MessageSquare, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PoolDetail, ChartMetricId, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatCompactUsd } from "@/app/lib/borrow-sim"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart } from "../ui"
import { labelForPoolMetric } from "../lib/selectors"

type PoolHeroProps = {
  detail: PoolDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

const BAR_METRICS: ReadonlySet<ChartMetricId> = new Set<ChartMetricId>(["volume", "fees"])
const RANGE_OPTIONS: Array<{ value: TimeRangeId; label: string }> = [
  { value: "1D", label: "24H" },
  { value: "1W", label: "7D" },
  { value: "1M", label: "30D" },
  { value: "3M", label: "90D" },
  { value: "1Y", label: "1Y" },
]
const TOKEN_CHART_HEIGHT = 320

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
  const metaLabel = detail.hero.chain

  return (
    <header className={cn("border-b border-border pb-5", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <div className="flex -space-x-2.5">
              <TokenAvatar visual={detail.hero.visuals[0]} />
              <TokenAvatar visual={detail.hero.visuals[1]} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[21px] font-normal leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
              <BadgeCheck
                className="h-[24px] w-[24px] shrink-0 -translate-y-[3px] fill-muted-foreground text-background"
                aria-hidden="true"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-[3px] text-[12px] font-medium leading-none text-foreground">
                {detail.hero.feeTier || detail.hero.venue}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(metaLabel)
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-normal leading-none text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Copy chain"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                <span>{metaLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-center pl-5 lg:flex">
          <HeroIcon
            label="Search"
            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")}
          >
            <Search className="h-3.5 w-3.5" />
          </HeroIcon>
          <HeroIcon
            label="Website"
            onClick={() =>
              window.open(
                detail.hero.explorerUrl ?? `https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`,
                "_blank",
              )
            }
          >
            <Globe className="h-3.5 w-3.5" />
          </HeroIcon>
          <HeroIcon
            label="X"
            onClick={() => window.open(`https://x.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")}
          >
            <XIcon />
          </HeroIcon>
          <HeroIcon label="Share" onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <MessageSquare className="h-3.5 w-3.5" />
          </HeroIcon>
          {actions}
        </div>
      </div>
    </header>
  )
}

export function PoolHero({ detail, leading, actions, className, hideIdentity = false }: PoolHeroProps) {
  const metric = detail.heroMetric.metricId
  const [range, setRange] = React.useState<TimeRangeId>("1W")
  const chartType: "line" | "bar" = BAR_METRICS.has(metric) ? "bar" : "line"

  const series = detail.heroMetric.series[metric][range]
  const points = series.points
  const pctChange = detail.heroMetric.delta.value
  const formatValue = React.useCallback(
    (v: number) => (metric === "price" ? formatPrice(v) : formatCompactUsd(v)),
    [metric],
  )
  const valueLabel = detail.heroMetric.valueLabel
  const displayDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(points[points.length - 1]?.t ?? "2026-05-28"),
  )

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="pool-hero">
      {hideIdentity ? null : (
        <PoolHeroIdentity detail={detail} leading={leading} actions={actions} />
      )}

      <div className="pt-4" data-testid="pool-hero-chart-card">
        <div className="mb-8">
          <p className="font-data text-[26px] font-normal leading-none tracking-[-0.03em] text-foreground">
            {valueLabel}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[13px]">
            <span className={cn("tabular-nums font-normal", pctChange < 0 ? "text-rose-500" : "text-emerald-500")}>
              {pctChange < 0 ? "▼" : "▲"} {formatPct(Math.abs(pctChange), 2)}
            </span>
            <span className="font-normal text-muted-foreground">{displayDate}</span>
          </p>
        </div>

        <div className="relative w-full">
          <div style={{ height: TOKEN_CHART_HEIGHT }}>
            <LightweightChart
              series={series}
              type={chartType}
              height={TOKEN_CHART_HEIGHT}
              accentClassName={detail.hero.visuals.map((visual) => visual.textClass)}
              ariaLabel={`${labelForPoolMetric(metric)} over ${range}`}
              formatValue={formatValue}
              showLastLabel
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex items-center rounded-full bg-surface-inset p-[3px]"
          >
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
                    "rounded-full px-3.5 py-1.5 text-[11.5px] font-medium transition-all",
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
          <button
            type="button"
            aria-label="Expand chart"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:border-border/80 hover:bg-surface-inset hover:text-foreground"
          >
            <LoginCameraIcon />
          </button>
        </div>
      </div>
    </section>
  )
}

function TokenAvatar({ visual }: { visual: PoolDetail["hero"]["visuals"][number] }) {
  return (
    <span className={cn("inline-flex size-12 items-center justify-center", visual.textClass)} aria-label={visual.symbol}>
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-12 object-contain" width={48} height={48} fetchPriority="high" />
      ) : (
        <span className="text-[12px] font-medium">{visual.shortLabel}</span>
      )}
    </span>
  )
}

function HeroIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
    >
      {children}
    </button>
  )
}

function XIcon() {
  return (
    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M16.093 12.7389L24.283 3H22.3422L15.2308 11.4562L9.55101 3H3L11.589 15.7872L3 26H4.94088L12.4507 17.07L18.449 26H25L16.0925 12.7389H16.093ZM13.4347 15.8999L12.5644 14.6266L5.6402 4.49462H8.62127L14.2092 12.6714L15.0795 13.9448L22.3431 24.5733H19.3621L13.4347 15.9004V15.8999Z" />
    </svg>
  )
}

function LoginCameraIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2.086a1.5 1.5 0 0 0 1.06-.44l.708-.706A1.5 1.5 0 0 1 11.414 3h1.172a1.5 1.5 0 0 1 1.06.44l.708.706a1.5 1.5 0 0 0 1.06.44H17.5A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17.2 8.1h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function formatPrice(v: number): string {
  if (v >= 100) return `$${v.toFixed(2)}`
  if (v >= 1) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

void formatPct

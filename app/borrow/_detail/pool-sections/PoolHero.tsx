"use client"

import * as React from "react"
import { Copy, ExternalLink, Share2 } from "lucide-react"
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
    <header className={cn("border-b border-border pb-5", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <div className="flex -space-x-2">
              <TokenAvatar visual={detail.hero.visuals[0]} />
              <TokenAvatar visual={detail.hero.visuals[1]} />
            </div>
            <div className="absolute bottom-0 right-0 translate-x-1.5 translate-y-1.5">
              <div className="flex size-6 items-center justify-center rounded-lg border-2 border-border-extra-light bg-white">
                <RiskScoreIcon />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[21px] font-normal leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
              <button
                type="button"
                aria-label="View risk score"
                className="inline-flex items-center justify-center text-text-medium transition-colors hover:text-text-high"
              >
                <RiskScoreIcon className="shrink-0" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-[3px] text-[12px] font-medium leading-none text-foreground">
                {detail.hero.feeTier || detail.hero.venue}
              </span>
              <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-[3px] text-[12px] font-medium leading-none text-foreground">
                {detail.hero.chain}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">{detail.hero.subtitle}</p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-center pl-5 lg:flex">
          <HeroIconButton
            label="Copy link"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href)
            }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </HeroIconButton>
          <HeroIconButton
            label="Share page"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ title: detail.hero.name, url: window.location.href })
                return
              }
              await navigator.clipboard.writeText(window.location.href)
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </HeroIconButton>
          {detail.hero.explorerUrl ? (
            <HeroIconButton
              label="Open in block explorer"
              onClick={() => window.open(detail.hero.explorerUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </HeroIconButton>
          ) : null}
          {actions}
        </div>
        <div className="sm:hidden absolute top-0 right-12">
          <HeroIconButton
            label="Open links"
            onClick={() => {
              document.querySelector("#related-pools")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </HeroIconButton>
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
      </div>
    </section>
  )
}

function RiskScoreIcon({ className }: { className?: string }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.99665 0.397911C8.34164 0.132367 8.7542 -0.000101085 9.16667 5.7874e-08C9.57914 -0.000101085 9.9917 0.132367 10.3367 0.397911L11.3147 1.14887L12.5404 0.987587C13.4029 0.873917 14.2327 1.35456 14.5655 2.15666L15.0363 3.29722L16.1752 3.76741L16.1768 3.76809C16.9789 4.10087 17.4594 4.93111 17.3457 5.79362L17.1846 7.01824L17.936 7.99688C18.1345 8.25543 18.2588 8.5521 18.3085 8.85832C18.3447 9.0816 18.3413 9.30997 18.2983 9.53234C18.2429 9.81819 18.1221 10.0941 17.936 10.3364L17.1846 11.3151L17.3457 12.5397C17.4594 13.4022 16.9789 14.2325 16.1768 14.5652L16.1752 14.5659L15.0363 15.0361L14.5655 16.1767C14.2327 16.9788 13.4029 17.4594 12.5404 17.3457L11.3147 17.1845L10.3367 17.9354C9.9917 18.201 9.57914 18.3334 9.16667 18.3333C8.7542 18.3334 8.34164 18.201 7.99665 17.9354L7.01863 17.1845L5.79296 17.3457C4.9304 17.4594 4.10061 16.9788 3.76787 16.1767L3.29702 15.0361L2.15816 14.5659L2.15653 14.5652C1.35443 14.2325 0.873935 13.4022 0.987585 12.5397L1.14871 11.3151L0.397352 10.3364C0.181227 10.055 0.0531547 9.7284 0.0134099 9.39348C-0.0442376 8.90785 0.0840222 8.40491 0.397352 7.99688L1.14871 7.01824L0.987585 5.79362C0.873935 4.93111 1.35443 4.10087 2.15653 3.76809L2.15816 3.76741L3.29702 3.29722L3.76787 2.15666C4.10061 1.35456 4.9304 0.873917 5.79296 0.987587L7.01863 1.14887L7.99665 0.397911ZM12.6726 7.67259C12.998 7.34715 12.998 6.81951 12.6726 6.49408C12.3472 6.16864 11.8195 6.16864 11.4941 6.49408L8.33333 9.65482L7.25592 8.57741C6.93049 8.25197 6.40285 8.25197 6.07741 8.57741C5.75197 8.90285 5.75197 9.43049 6.07741 9.75592L7.74408 11.4226C8.06952 11.748 8.59715 11.748 8.92259 11.4226L12.6726 7.67259Z"
        className="fill-current opacity-[0.72]"
      />
    </svg>
  )
}

function TokenAvatar({ visual }: { visual: PoolDetail["hero"]["visuals"][number] }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border-2 border-background ring-1 ring-border",
        visual.bgClass,
        visual.textClass,
      )}
      aria-label={visual.symbol}
    >
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.iconUrl} alt="" className="size-6 rounded-full" width={24} height={24} fetchPriority="high" />
      ) : (
        <span className="text-[12px] font-medium">{visual.shortLabel}</span>
      )}
    </span>
  )
}

function HeroIconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-full text-text-medium transition-colors hover:bg-gray-50 hover:text-text-high"
    >
      {children}
    </button>
  )
}

function formatPrice(v: number): string {
  if (v >= 100) return `$${v.toFixed(2)}`
  if (v >= 1) return `$${v.toFixed(4)}`
  return `$${v.toFixed(6)}`
}

void formatPct

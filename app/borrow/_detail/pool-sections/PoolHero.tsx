"use client"

import * as React from "react"
import Link from "next/link"
import { Copy, ExternalLink, Share2, ChevronDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  const relatedCount = Math.max(detail.related.length, 1)
  return (
    <div className={cn("border-b border-border-light pb-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-0 sm:gap-5">
        <div className="flex cols-span-1 items-start flex-col sm:flex-row sm:col-span-8 gap-2 sm:items-end">
          <div className="relative flex-shrink-0 mr-2">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-title-md text-text-extra-high font-semibold truncate">{detail.hero.name}</h1>
              <button
                type="button"
                aria-label="View risk score"
                className="inline-flex items-center justify-center text-text-medium hover:text-text-high transition-colors"
              >
                <RiskScoreIcon className="shrink-0" />
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="rounded-full border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-150 ease-out motion-reduce:transition-none border-transparent bg-[var(--badge-default-bg)] backdrop-blur-sm hover:cursor-crosshair px-2 py-1 text-[var(--badge-default-text)] font-medium text-xs inline-flex items-center gap-1">
                <span className="font-sans tabular-nums">{detail.hero.feeTier || detail.hero.venue}</span>
              </div>
              <div className="rounded-full border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-150 ease-out motion-reduce:transition-none border-transparent bg-[var(--badge-default-bg)] backdrop-blur-sm hover:cursor-crosshair px-2 py-1 text-[var(--badge-default-text)] font-medium text-xs inline-flex items-center gap-1">
                <span className="font-sans tabular-nums">{detail.hero.chain}</span>
              </div>
              <Link
                href="#related-pools"
                className="bg-[var(--badge-default-bg)] backdrop-blur-sm hover:cursor-crosshair px-2 py-1 text-[var(--badge-default-text)] font-medium text-xs inline-flex items-center gap-1 transition-colors cursor-crosshair rounded-full"
              >
                <span className="font-sans tabular-nums">{relatedCount}+</span>RELATED
                <ChevronDown className="ml-0.5 size-3 text-[var(--badge-default-text)]/80 transition-transform duration-150 ease-out motion-reduce:transition-none" />
              </Link>
            </div>
            <p className="mt-2 text-[13px] text-text-medium">{detail.hero.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
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
          {actions}
        </div>
        <div className="col-span-4" />
      </div>
    </div>
  )
}

export function PoolHero({ detail, leading, actions, className, hideIdentity = false }: PoolHeroProps) {
  const metric = detail.heroMetric.metricId
  const [range, setRange] = React.useState<TimeRangeId>("1W")
  const chartType: "line" | "bar" = BAR_METRICS.has(metric) ? "bar" : "line"

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
  const valueLabel = detail.heroMetric.valueLabel

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="pool-hero">
      {hideIdentity ? null : (
        <PoolHeroIdentity detail={detail} leading={leading} actions={actions} />
      )}

      {/* ── 2. Chart card with overlayed value + delta ── */}
      <Card
        className="relative overflow-hidden border-border/40 bg-background/70 shadow-none"
        data-testid="pool-hero-chart-card"
      >
        <CardContent className="relative p-0">
          <div className="h-[380px] w-full md:h-[460px]">
            <LightweightChart
              series={series}
              type={chartType}
              height={460}
              accentClassName={detail.hero.visuals.map((visual) => visual.textClass)}
              ariaLabel={`${labelForPoolMetric(metric)} over ${range}`}
              formatValue={formatValue}
              showLastLabel
            />
          </div>
          <div className="pointer-events-none absolute left-5 top-5 z-[2]">
            <div className="font-data text-[20px] font-medium leading-none tabular-nums text-foreground md:text-[22px]">
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

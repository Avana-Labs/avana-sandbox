"use client"

import * as React from "react"
import { BadgeCheck, Camera, Copy, Globe, MessageSquare, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssetChartMetricId, AssetDetail, TimeRangeId } from "@/app/lib/borrow-detail"
import { formatPct } from "@/app/lib/borrow-detail"
import { LightweightChart, type TokenChartHover } from "../ui"
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
  const metaLabel = detail.hero.contractLabel ?? detail.hero.chain

  return (
    <header className={cn("border-b border-[#E8E8E8] pb-5", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <span
              className={cn(
                "inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-[#EEF0FF]",
                detail.hero.visual.bgClass,
                detail.hero.visual.textClass,
              )}
              aria-label={detail.hero.symbol}
            >
              {detail.hero.visual.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.hero.visual.iconUrl} alt="" className="size-9 object-contain" />
              ) : (
                <span className="text-[11px] font-medium">{detail.hero.visual.shortLabel}</span>
              )}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[21px] font-medium leading-none tracking-[-0.02em] text-[#111111]">
                {detail.hero.name}
              </h1>
              <BadgeCheck className="h-[24px] w-[24px] shrink-0 -translate-y-[3px] fill-[#B8B8B8] text-white" aria-hidden="true" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-[#737373]">
              <span className="inline-flex items-center rounded-full bg-[#F0F0F0] px-2.5 py-[3px] text-[12px] font-medium leading-none text-[#404040]">
                ${detail.hero.symbol}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(detail.hero.contractAddress ?? metaLabel)
                }}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-[#111111]"
                aria-label="Copy contract"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-[13px]">{metaLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-5 self-center pl-5 lg:flex">
          <HeroIcon label="Search" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${detail.hero.name} ${detail.hero.symbol}`)}`, "_blank")}>
            <Search className="h-[18px] w-[18px]" strokeWidth={1.35} />
          </HeroIcon>
          <HeroIcon
            label="Website"
            onClick={() =>
              window.open(detail.hero.websiteUrl ?? `https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")
            }
          >
            <Globe className="h-[18px] w-[18px]" strokeWidth={1.35} />
          </HeroIcon>
          <HeroIcon
            label="X"
            onClick={() => window.open(detail.hero.xUrl ?? `https://x.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")}
          >
            <XIcon />
          </HeroIcon>
          <HeroIcon label="Share" onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.35} />
          </HeroIcon>
          {actions}
        </div>
      </div>
    </header>
  )
}

export function AssetHero({ detail, leading, actions, className, hideIdentity = false }: Props) {
  const metric = detail.heroMetric.metricId
  const [range, setRange] = React.useState<TimeRangeId>("1W")
  const [hover, setHover] = React.useState<TokenChartHover | null>(null)

  React.useEffect(() => {
    setHover(null)
  }, [range])

  const chartType: "line" | "bar" = BAR_METRICS.has(metric) ? "bar" : "line"
  const series = detail.heroMetric.series[metric][range]

  const displayPrice = hover ? formatHeroValue(hover.value) : detail.heroMetric.valueLabel
  const displayDate = hover
    ? formatHeroTime(hover.time)
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(series.points[series.points.length - 1]?.t ?? "2026-05-28"),
      )

  const hoverDelta = React.useMemo(() => {
    if (!hover || series.points.length < 2) return null
    const first = series.points[0].v
    const pct = ((hover.value - first) / first) * 100
    return { pct, direction: pct < 0 ? ("down" as const) : pct > 0 ? ("up" as const) : ("flat" as const) }
  }, [hover, series.points])

  const deltaPct = hoverDelta ? Math.abs(hoverDelta.pct) : Math.abs(detail.heroMetric.delta.value)
  const deltaDir = hoverDelta?.direction ?? detail.heroMetric.delta.direction

  return (
    <section className={cn(className)} data-testid="asset-hero">
      {hideIdentity ? null : <AssetHeroIdentity detail={detail} leading={leading} actions={actions} />}

      <div className="pt-6" data-testid="asset-hero-chart-card">
        <div className="mb-5">
          <p className="font-data text-[30px] font-medium leading-none tracking-[-0.03em] text-[#111111]">
            {displayPrice}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[13px]">
            <span className={cn("tabular-nums font-normal", deltaDir === "down" ? "text-[#E45C4C]" : "text-[#22A06B]")}>
              {deltaDir === "down" ? "▼" : "▲"} {formatPct(deltaPct, 2)}
            </span>
            <span className="font-normal text-[#9B9B9B]">{displayDate}</span>
          </p>
        </div>

        <div className="relative w-full">
          {metric === "price" ? (
            <LightweightChart
              series={series}
              type="area"
              height={248}
              variant="token"
              showEndDot
              timeRange={range}
              ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
              formatValue={formatHeroValue}
              formatTime={formatHeroTime}
              onHoverChange={setHover}
            />
          ) : (
            <div className="h-[248px]">
              <LightweightChart
                series={series}
                type={chartType}
                height={248}
                accentClassName="text-zinc-700"
                ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
                formatValue={formatHeroValue}
                formatTime={formatHeroTime}
              />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Time range"
            className="inline-flex items-center rounded-full bg-[#EFEFEF] p-[3px]"
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
                    "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all",
                    active
                      ? "bg-white text-[#111111] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                      : "text-[#8C8C8C] hover:text-[#111111]",
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
            className="inline-flex size-8 items-center justify-center rounded-md text-[#B0B0B0] transition-colors hover:bg-[#F5F5F5] hover:text-[#666666]"
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  )
}

function HeroIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex items-center justify-center text-[#A3A3A3] transition-colors hover:text-[#555555]"
    >
      {children}
    </button>
  )
}

function XIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M16.093 12.7389L24.283 3H22.3422L15.2308 11.4562L9.55101 3H3L11.589 15.7872L3 26H4.94088L12.4507 17.07L18.449 26H25L16.0925 12.7389H16.093ZM13.4347 15.8999L12.5644 14.6266L5.6402 4.49462H8.62127L14.2092 12.6714L15.0795 13.9448L22.3431 24.5733H19.3621L13.4347 15.9004V15.8999Z"
        fill="currentColor"
      />
    </svg>
  )
}

function formatHeroValue(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatHeroTime(iso: string) {
  const date = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  if (iso.includes("T")) {
    return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

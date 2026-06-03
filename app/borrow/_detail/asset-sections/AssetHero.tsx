"use client"

import * as React from "react"
import { BadgeCheck, Copy, Globe, MessageSquare, Search } from "lucide-react"
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

const TOKEN_CHART_HEIGHT = 320

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
    <header className={cn("border-b border-border pb-5", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <span
              className={cn(
                "inline-flex size-14 items-center justify-center overflow-hidden rounded-full bg-surface-inset",
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
              <h1 className="truncate text-[21px] font-normal leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
              <BadgeCheck className="h-[24px] w-[24px] shrink-0 -translate-y-[3px] fill-muted-foreground text-background" aria-hidden="true" />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-[3px] text-[12px] font-medium leading-none text-foreground">
                ${detail.hero.symbol}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(detail.hero.contractAddress ?? metaLabel)
                }}
                className="inline-flex items-center gap-1.5 text-[13px] font-normal leading-none text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Copy contract"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                <span>{metaLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-center pl-5 lg:flex">
          <HeroIcon label="Search" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${detail.hero.name} ${detail.hero.symbol}`)}`, "_blank")}>
            <Search className="h-3.5 w-3.5" />
          </HeroIcon>
          <HeroIcon
            label="Website"
            onClick={() =>
              window.open(detail.hero.websiteUrl ?? `https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")
            }
          >
            <Globe className="h-3.5 w-3.5" />
          </HeroIcon>
          <HeroIcon
            label="X"
            onClick={() => window.open(detail.hero.xUrl ?? `https://x.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")}
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

      <div className="pt-4" data-testid="asset-hero-chart-card">
        <div className="mb-8">
      <p className="font-data text-[26px] font-normal leading-none tracking-[-0.03em] text-foreground">
            {displayPrice}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[13px]">
            <span className={cn("tabular-nums font-normal", deltaDir === "down" ? "text-rose-500" : "text-emerald-500")}>
              {deltaDir === "down" ? "▼" : "▲"} {formatPct(deltaPct, 2)}
            </span>
            <span className="font-normal text-muted-foreground">{displayDate}</span>
          </p>
        </div>

        <div className="relative w-full">
          {metric === "price" ? (
            <LightweightChart
              series={series}
              type="area"
              height={TOKEN_CHART_HEIGHT}
              variant="token"
              priceRange={{ min: 1800, max: 2040 }}
              showEndDot
              timeRange={range}
              ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
              formatValue={formatHeroValue}
              formatTime={formatHeroTime}
              onHoverChange={setHover}
            />
          ) : (
            <div style={{ height: TOKEN_CHART_HEIGHT }}>
              <LightweightChart
                series={series}
                type={chartType}
                height={TOKEN_CHART_HEIGHT}
                accentClassName="text-foreground"
                ariaLabel={`${labelForAssetMetric(metric)} over ${range}`}
                formatValue={formatHeroValue}
                formatTime={formatHeroTime}
              />
            </div>
          )}
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
      <path
        d="M16.093 12.7389L24.283 3H22.3422L15.2308 11.4562L9.55101 3H3L11.589 15.7872L3 26H4.94088L12.4507 17.07L18.449 26H25L16.0925 12.7389H16.093ZM13.4347 15.8999L12.5644 14.6266L5.6402 4.49462H8.62127L14.2092 12.6714L15.0795 13.9448L22.3431 24.5733H19.3621L13.4347 15.9004V15.8999Z"
      />
    </svg>
  )
}

function LoginCameraIcon() {
  return (
    <svg
      width="19.4824"
      height="19.1309"
      viewBox="0 0 19.4824 19.1309"
      aria-hidden="true"
      className="h-4 w-4 fill-current"
    >
      <g>
        <rect height="19.1309" opacity="0" width="19.4824" x="0" y="0" />
        <path d="M0.78125 6.23047C1.29883 6.23047 1.57227 5.9375 1.57227 5.42969L1.57227 3.125C1.57227 2.10938 2.10938 1.5918 3.08594 1.5918L5.44922 1.5918C5.9668 1.5918 6.25 1.30859 6.25 0.800781C6.25 0.292969 5.9668 0.0195312 5.44922 0.0195312L3.06641 0.0195312C1.02539 0.0195312 0 1.02539 0 3.03711L0 5.42969C0 5.9375 0.283203 6.23047 0.78125 6.23047ZM18.3301 6.23047C18.8477 6.23047 19.1211 5.9375 19.1211 5.42969L19.1211 3.03711C19.1211 1.02539 18.0957 0.0195312 16.0547 0.0195312L13.6621 0.0195312C13.1543 0.0195312 12.8711 0.292969 12.8711 0.800781C12.8711 1.30859 13.1543 1.5918 13.6621 1.5918L16.0254 1.5918C16.9922 1.5918 17.5488 2.10938 17.5488 3.125L17.5488 5.42969C17.5488 5.9375 17.832 6.23047 18.3301 6.23047ZM3.06641 19.1309L5.44922 19.1309C5.9668 19.1309 6.25 18.8477 6.25 18.3496C6.25 17.8418 5.9668 17.5586 5.44922 17.5586L3.08594 17.5586C2.10938 17.5586 1.57227 17.041 1.57227 16.0254L1.57227 13.7207C1.57227 13.2031 1.28906 12.9199 0.78125 12.9199C0.273438 12.9199 0 13.2031 0 13.7207L0 16.1035C0 18.125 1.02539 19.1309 3.06641 19.1309ZM13.6621 19.1309L16.0547 19.1309C18.0957 19.1309 19.1211 18.1152 19.1211 16.1035L19.1211 13.7207C19.1211 13.2031 18.8379 12.9199 18.3301 12.9199C17.8223 12.9199 17.5488 13.2031 17.5488 13.7207L17.5488 16.0254C17.5488 17.041 16.9922 17.5586 16.0254 17.5586L13.6621 17.5586C13.1543 17.5586 12.8711 17.8418 12.8711 18.3496C12.8711 18.8477 13.1543 19.1309 13.6621 19.1309Z" fill="currentColor" fillOpacity="0.85" />
        <path d="M5.20508 13.9844L13.9258 13.9844C14.9512 13.9844 15.4785 13.4766 15.4785 12.4609L15.4785 7.30469C15.4785 6.26953 14.9512 5.76172 13.9258 5.76172L12.6562 5.76172C12.2754 5.76172 12.1582 5.69336 11.9336 5.43945L11.5332 5C11.2891 4.72656 11.0352 4.58984 10.5371 4.58984L8.56445 4.58984C8.05664 4.58984 7.80273 4.72656 7.55859 5L7.1582 5.43945C6.93359 5.68359 6.81641 5.76172 6.43555 5.76172L5.20508 5.76172C4.16992 5.76172 3.65234 6.26953 3.65234 7.30469L3.65234 12.4609C3.65234 13.4766 4.16992 13.9844 5.20508 13.9844ZM9.58008 12.7637C7.94922 12.7637 6.64062 11.4648 6.64062 9.82422C6.64062 8.20312 7.94922 6.9043 9.58008 6.9043C11.1914 6.9043 12.4902 8.20312 12.4902 9.82422C12.4902 11.4941 11.1914 12.7637 9.58008 12.7637ZM9.57031 11.9141C10.7129 11.9141 11.6504 10.9961 11.6504 9.82422C11.6504 8.67188 10.7129 7.74414 9.57031 7.74414C8.41797 7.74414 7.48047 8.67188 7.48047 9.82422C7.48047 10.9961 8.41797 11.9141 9.57031 11.9141ZM13.4668 8.42773C13.1055 8.42773 12.8125 8.13477 12.8125 7.76367C12.8125 7.39258 13.1055 7.09961 13.4668 7.09961C13.8281 7.09961 14.1309 7.39258 14.1309 7.76367C14.1309 8.13477 13.8281 8.42773 13.4668 8.42773Z" fill="currentColor" fillOpacity="0.85" />
      </g>
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

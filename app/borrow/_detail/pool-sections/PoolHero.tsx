"use client"

import * as React from "react"
import { Copy, Globe, MessageSquare } from "@/app/components/icons"
import { cn } from "@/lib/utils"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import type { PoolHeroPreloads } from "@/app/lib/borrow-detail/hero-preload"
import { usePreloadedQuery } from "convex/react"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { buildHeroFeedFromConvexSeries, getPoolHeroFeed } from "@/app/lib/chart-feeds"
import { useConvexLiveSession } from "@/app/lib/convex/use-convex-live-session"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { buildFeedFromRangeSeries, resolveHeroContractLabel } from "@/app/borrow/_detail/lib/hero-chart-feeds"

type PoolHeroProps = {
  detail: PoolDetail
  heroPreloads?: PoolHeroPreloads | null
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

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
  const { t } = useTranslation()
  const contractLabel = resolveHeroContractLabel(detail.id, detail.hero.explorerUrl)

  return (
    <header className={cn("pb-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <div className="flex -space-x-2.5">
              <TokenAvatar visual={detail.hero.visuals[0]} />
              <TokenAvatar visual={detail.hero.visuals[1]} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 translate-y-1 items-baseline gap-2.5 whitespace-nowrap">
              <h1 className="min-w-0 truncate text-[25px] font-semibold leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[15px] font-medium text-foreground/75">
              <span className="leading-none text-foreground/75">{detail.hero.chain}</span>
              <span aria-hidden className="h-5 w-px bg-border" />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(contractLabel)
                }}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full text-[15px] font-medium leading-none text-foreground/75 transition-colors hover:text-foreground"
                aria-label={`${t("Copy")} ${contractLabel}`}
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{contractLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-center sm:pl-5">
          <HeroIcon
            label={t("Website")}
            onClick={() => {
              if (!detail.hero.explorerUrl) return
              window.open(detail.hero.explorerUrl, "_blank")
            }}
          >
            <Globe className="h-[18px] w-[18px]" />
          </HeroIcon>
          <HeroIcon
            label={t("X")}
            onClick={() => {
              if (!detail.hero.xUrl) return
              window.open(detail.hero.xUrl, "_blank")
            }}
          >
            <XIcon />
          </HeroIcon>
          <HeroIcon label={t("Share")} onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <MessageSquare className="h-3.5 w-3.5" />
          </HeroIcon>
          {actions}
        </div>
      </div>
    </header>
  )
}

/**
 * Live wrapper: when a Convex provider is present (open-gate / signed-in sandbox),
 * hydrate the three hero series from the server-preloaded tokens via `usePreloadedQuery`
 * and subscribe for live updates — no client re-fetch (the server already fetched them via
 * preloadPoolHero). Overrides the server-built feed props with the live values. Signed-out
 * public pages (or no preloads) render the static `PoolHeroView` — see the chooser below.
 */
function PoolHeroLive({ preloads, ...props }: PoolHeroProps & { preloads: PoolHeroPreloads }) {
  const { detail } = props
  const tvl = usePreloadedQuery(preloads.tvl)
  const borrowed = usePreloadedQuery(preloads.borrowed)
  const utilization = usePreloadedQuery(preloads.utilization)
  const liveDetail = React.useMemo(
    () => ({
      ...detail,
      heroFeed: buildHeroFeedFromConvexSeries(tvl?.points ?? [], "usdCompact") ?? detail.heroFeed,
      heroBorrowedFeed: buildHeroFeedFromConvexSeries(borrowed?.points ?? [], "usdCompact") ?? detail.heroBorrowedFeed,
      heroUtilizationFeed:
        buildHeroFeedFromConvexSeries(utilization?.points ?? [], "percent") ?? detail.heroUtilizationFeed,
    }),
    [detail, tvl, borrowed, utilization],
  )
  return <PoolHeroView {...props} detail={liveDetail} />
}

export function PoolHero(props: PoolHeroProps) {
  const live = useConvexLiveSession()
  // Live only when a Convex provider is present AND the server handed us preload tokens
  // (absent in no-backend builds — CI/Lighthouse — where the static view falls back cleanly).
  return live && props.heroPreloads ? (
    <PoolHeroLive {...props} preloads={props.heroPreloads} />
  ) : (
    <PoolHeroView {...props} />
  )
}

function PoolHeroView({ detail, leading, actions, className, hideIdentity = false }: PoolHeroProps) {
  const { t } = useTranslation()
  const metricTabs = React.useMemo(() => [t("Supplied"), t("Borrowed"), t("Utilization")], [t])
  const [activeMetricTab, setActiveMetricTab] = React.useState(metricTabs[0])
  React.useEffect(() => {
    setActiveMetricTab(metricTabs[0])
  }, [metricTabs])
  // Prefer Convex-backed feeds for every hero tab. Borrowed/Utilization used to
  // read mock series seeded from spoke.liquidityUsd (~$1.25B), which disagreed
  // with Convex Supplied (~$63M) on the same page.
  const feed = React.useMemo(() => {
    if (activeMetricTab === metricTabs[1]) {
      return (
        detail.heroBorrowedFeed ??
        buildFeedFromRangeSeries(
          detail.heroMetric.series.borrowed,
          "usdCompact",
          detail.heroFeed ?? getPoolHeroFeed(detail.id),
        )
      )
    }
    if (activeMetricTab === metricTabs[2]) {
      return (
        detail.heroUtilizationFeed ??
        buildFeedFromRangeSeries(
          detail.heroMetric.series.utilization,
          "percent",
          detail.heroFeed ?? getPoolHeroFeed(detail.id),
        )
      )
    }
    return (
      detail.heroFeed ??
      buildFeedFromRangeSeries(detail.heroMetric.series.tvl, "usdCompact", getPoolHeroFeed(detail.id))
    )
  }, [
    activeMetricTab,
    detail.heroBorrowedFeed,
    detail.heroFeed,
    detail.heroMetric.series,
    detail.heroUtilizationFeed,
    detail.id,
    metricTabs,
  ])

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="pool-hero">
      {hideIdentity ? null : <PoolHeroIdentity detail={detail} leading={leading} actions={actions} />}

      <div className="pt-4" data-testid="pool-hero-chart-card">
        <MarketHeroChart
          feed={feed}
          defaultRange="1M"
          gradientId={`poolHeroFill-${detail.id}`}
          height={310}
          showMeta={false}
          metricTabs={metricTabs}
          activeMetricTab={activeMetricTab}
          onMetricTabChange={setActiveMetricTab}
          balanceVariant="strong"
          balanceClassName="absolute left-0 top-0 z-10 -translate-y-0.5"
        />
      </div>
    </section>
  )
}

function TokenAvatar({ visual }: { visual: PoolDetail["hero"]["visuals"][number] }) {
  return (
    <span
      role="img"
      className={cn("inline-flex size-16 items-center justify-center", visual.textClass)}
      aria-label={visual.symbol}
    >
      {visual.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.iconUrl}
          alt=""
          className="size-16 object-contain"
          width={64}
          height={64}
          fetchPriority="high"
        />
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
      className="flex size-10 items-center justify-center rounded-full text-foreground/75 transition-colors hover:bg-hover hover:text-foreground md:size-9"
    >
      {children}
    </button>
  )
}

function XIcon() {
  return (
    <svg className="h-[18px] w-[18px] fill-current" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M16.093 12.7389L24.283 3H22.3422L15.2308 11.4562L9.55101 3H3L11.589 15.7872L3 26H4.94088L12.4507 17.07L18.449 26H25L16.0925 12.7389H16.093ZM13.4347 15.8999L12.5644 14.6266L5.6402 4.49462H8.62127L14.2092 12.6714L15.0795 13.9448L22.3431 24.5733H19.3621L13.4347 15.9004V15.8999Z" />
    </svg>
  )
}

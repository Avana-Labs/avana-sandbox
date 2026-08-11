"use client"

import * as React from "react"
import { Copy, Globe, MessageSquare } from "@/app/components/icons"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { getAssetHeroFeed } from "@/app/lib/chart-feeds"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import { buildFeedFromSeries } from "@/app/borrow/_detail/lib/hero-chart-feeds"

type Props = {
  detail: AssetDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

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
  const { t } = useTranslation()
  const metaLabel = detail.hero.contractLabel ?? detail.hero.chain

  return (
    <header className={cn("pb-5", className)}>
      <div className="flex items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            {leading}
            <span
              role="img"
              aria-label={detail.hero.symbol}
              className={cn("inline-flex size-16 items-center justify-center", detail.hero.visual.textClass)}
            >
              {detail.hero.visual.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.hero.visual.iconUrl}
                  alt=""
                  className="size-16 object-contain"
                  width={64}
                  height={64}
                  fetchPriority="high"
                />
              ) : (
                <span className="text-[13px] font-medium">{detail.hero.visual.shortLabel}</span>
              )}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 translate-y-1 items-baseline gap-2.5 whitespace-nowrap">
              <h1 className="min-w-0 truncate text-[25px] font-semibold leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
              <span className="shrink-0 text-[20px] font-medium leading-none tracking-[-0.01em] text-foreground/55">
                {detail.hero.symbol}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[15px] font-medium text-foreground/75">
              <span className="leading-none text-foreground/75">{detail.hero.chain}</span>
              <span aria-hidden className="h-5 w-px bg-border" />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(detail.hero.contractAddress ?? metaLabel)
                }}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full text-[15px] font-medium leading-none text-foreground/75 transition-colors hover:text-foreground"
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                <span>{metaLabel}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-center pl-5 lg:flex">
          <HeroIcon
            label={t("Website")}
            onClick={() =>
              window.open(
                detail.hero.websiteUrl ?? `https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`,
                "_blank",
              )
            }
          >
            <Globe className="h-[18px] w-[18px]" />
          </HeroIcon>
          <HeroIcon
            label="X"
            onClick={() =>
              window.open(
                detail.hero.xUrl ?? `https://x.com/search?q=${encodeURIComponent(detail.hero.name)}`,
                "_blank",
              )
            }
          >
            <XIcon />
          </HeroIcon>
          <HeroIcon label={t("Share")} onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <MessageSquare className="h-[18px] w-[18px]" />
          </HeroIcon>
          {actions}
        </div>
      </div>
    </header>
  )
}

export function AssetHero({ detail, leading, actions, className, hideIdentity = false }: Props) {
  const { t } = useTranslation()
  const metricTabs = React.useMemo(() => [t("Price"), t("Supplied"), t("Borrowed"), t("Utilization")], [t])
  const [activeMetricTab, setActiveMetricTab] = React.useState(metricTabs[0])
  React.useEffect(() => {
    setActiveMetricTab(metricTabs[0])
  }, [metricTabs])
  // Prefer the Convex-backed feed (total borrows); fall back to the local feed.
  const feed = React.useMemo(() => {
    const fallback = detail.heroFeed ?? getAssetHeroFeed(detail.id)
    if (activeMetricTab === metricTabs[1]) {
      return buildFeedFromSeries(detail.supplyBorrow.supplied, "usdCompact", fallback)
    }
    if (activeMetricTab === metricTabs[2]) {
      return buildFeedFromSeries(detail.supplyBorrow.borrowed, "usdCompact", fallback)
    }
    if (activeMetricTab === metricTabs[3]) {
      return buildFeedFromSeries(detail.supplyBorrow.utilization, "percent", fallback)
    }
    return fallback
  }, [activeMetricTab, detail.heroFeed, detail.id, detail.supplyBorrow, metricTabs])

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="asset-hero">
      {hideIdentity ? null : <AssetHeroIdentity detail={detail} leading={leading} actions={actions} />}

      <div className="pt-4" data-testid="asset-hero-chart-card">
        <MarketHeroChart
          feed={feed}
          defaultRange="1D"
          gradientId={`assetHeroFill-${detail.id}`}
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

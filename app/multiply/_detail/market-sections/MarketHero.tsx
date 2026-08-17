"use client"

import * as React from "react"
import { Copy, Globe, MessageSquare } from "@/app/components/icons"
import { cn } from "@/lib/utils"
import type { MultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { usePreloadedQuery } from "convex/react"
import type { MultiplyHeroPreloads } from "@/app/lib/multiply-detail/hero-preload"
import { MarketHeroChart } from "@/app/components/charts/market-hero-chart"
import { buildHeroFeedFromConvexSeries, getMultiplyMarketHeroFeed } from "@/app/lib/chart-feeds"
import { useConvexLiveSession } from "@/app/lib/convex/use-convex-live-session"
import { useTranslation } from "@/app/lib/i18n/use-translation"
import {
  buildFeedFromSeries,
  isPlaceholderHeroContractAddress,
  isSafeHeroLink,
  resolveHeroContractAddress,
  resolveHeroContractLabel,
} from "@/app/borrow/_detail/lib/hero-chart-feeds"
import { useMultiplySessionContext } from "@/app/lib/multiply-system/multiply-session-context"
import { useAvanaIdentity } from "@/app/lib/avana-session/avana-sessions-provider"
import { useDashboardMultiplyLive } from "@/app/dashboard/use-dashboard-multiply-live"
import { buildEmptyChartFeed, buildWalletPositionFeed } from "@/app/lib/chart-feeds/wallet-position-feed"

type MarketHeroProps = {
  detail: MultiplyMarketDetail
  heroPreloads?: MultiplyHeroPreloads | null
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  hideIdentity?: boolean
}

export function MarketHeroIdentity({
  detail,
  leading,
  actions,
  className,
}: {
  detail: MultiplyMarketDetail
  leading?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const contractLabel = resolveHeroContractLabel(detail.id, detail.hero.explorerUrl)
  // Suppress copy + Etherscan when the address is a synthetic placeholder that
  // points at no real contract.
  const isPlaceholderContract = isPlaceholderHeroContractAddress(
    resolveHeroContractAddress(detail.id, detail.hero.explorerUrl),
  )
  const websiteHref = isSafeHeroLink(detail.hero.explorerUrl)
    ? detail.hero.explorerUrl
    : `https://www.google.com/search?q=${encodeURIComponent(detail.hero.name)}`

  return (
    <header className={cn("pb-5", className)}>
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
            <div className="flex min-w-0 translate-y-1 items-baseline gap-2.5 whitespace-nowrap">
              <h1 className="min-w-0 truncate text-[25px] font-semibold leading-none tracking-[-0.02em] text-foreground">
                {detail.hero.name}
              </h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[15px] font-medium text-foreground/75">
              <span className="leading-none text-foreground/75">{detail.hero.chain}</span>
              <span aria-hidden className="h-5 w-px bg-border" />
              {isPlaceholderContract ? (
                <span className="inline-flex min-h-8 items-center text-[15px] font-medium leading-none text-foreground/75">
                  {contractLabel}
                </span>
              ) : (
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
              )}
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 self-center pl-5 lg:flex">
          <HeroIcon label={t("Website")} onClick={() => window.open(websiteHref, "_blank")}>
            <Globe className="h-[18px] w-[18px]" />
          </HeroIcon>
          <HeroIcon
            label="X"
            onClick={() => window.open(`https://x.com/search?q=${encodeURIComponent(detail.hero.name)}`, "_blank")}
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

/**
 * Live wrapper: hydrates the multiply supply hero series from the server-preloaded token
 * via `usePreloadedQuery` (no client re-fetch) and subscribes for updates, overriding the
 * server `heroFeed` (Supplied tab). Only the Supplied metric has a hero-series query;
 * Borrowed/Utilization stay on the server `supplyBorrow` snapshot. Only mounted where a
 * Convex provider exists AND preload tokens were handed down — see the chooser below.
 */
function MarketHeroLive({ preloads, ...props }: MarketHeroProps & { preloads: MultiplyHeroPreloads }) {
  const { detail } = props
  const supply = usePreloadedQuery(preloads.supply)
  const liveDetail = React.useMemo(
    () => ({
      ...detail,
      heroFeed: buildHeroFeedFromConvexSeries(supply?.points ?? [], "usdCompact") ?? buildEmptyChartFeed(),
    }),
    [detail, supply],
  )
  return <MarketHeroView {...props} detail={liveDetail} />
}

export function MarketHero(props: MarketHeroProps) {
  const live = useConvexLiveSession()
  return live && props.heroPreloads ? (
    <MarketHeroLive {...props} preloads={props.heroPreloads} />
  ) : (
    <MarketHeroView {...props} />
  )
}

function MarketHeroView({ detail, leading, actions, className, hideIdentity = false }: MarketHeroProps) {
  const { t } = useTranslation()
  const session = useMultiplySessionContext()
  const { walletId } = useAvanaIdentity()
  // Multiply positions aren't synthesized into the in-memory session from onboarding
  // balances, so "Your position" read only actively-opened positions and showed $0.
  // Read the authoritative Convex-backed portfolio (same adapter the dashboard uses)
  // so it reflects the real onboarded + live collateral in this market. (D4)
  const portfolioMultiply = useDashboardMultiplyLive(walletId, session)
  const metricTabs = React.useMemo(() => [t("Supplied"), t("Borrowed"), t("Utilization"), t("Your position")], [t])
  const [activeMetricTab, setActiveMetricTab] = React.useState(metricTabs[0])
  React.useEffect(() => {
    setActiveMetricTab(metricTabs[0])
  }, [metricTabs])
  // Prefer the Convex-backed feed (set by the server detail builder); fall back to the
  // local deterministic feed only when Convex is unreachable.
  const feed = React.useMemo(() => {
    const fallback = detail.heroFeed ?? getMultiplyMarketHeroFeed(detail.id)
    if (activeMetricTab === metricTabs[3]) {
      const convexValueUsd = (portfolioMultiply?.lpCollaterals ?? [])
        .filter((row) => row.marketId === detail.id && row.status === "open")
        .reduce((sum, row) => sum + row.collateralUsd, 0)
      const sessionValueUsd = Object.values(session.state.positions)
        .filter((position) => position.marketId === detail.id)
        .reduce((sum, position) => sum + position.collateralValueUsd, 0)
      const currentValueUsd = convexValueUsd > 0 ? convexValueUsd : sessionValueUsd
      return buildWalletPositionFeed(
        currentValueUsd,
        session.transactionHistory
          .filter((item) => item.marketId === detail.id && item.status === "success")
          .map((item) => ({
            timestamp: item.timestamp,
            deltaUsd: item.kind === "multiply" ? item.amountUsd : -item.amountUsd,
          })),
      )
    }
    if (activeMetricTab === metricTabs[1]) {
      return buildFeedFromSeries(detail.supplyBorrow.borrowed, "usdCompact", fallback)
    }
    if (activeMetricTab === metricTabs[2]) {
      return buildFeedFromSeries(detail.supplyBorrow.utilization, "percent", fallback)
    }
    return (
      detail.heroFeed ??
      buildFeedFromSeries(detail.supplyBorrow.supplied, "usdCompact", getMultiplyMarketHeroFeed(detail.id))
    )
  }, [
    activeMetricTab,
    detail.heroFeed,
    detail.id,
    detail.supplyBorrow,
    metricTabs,
    portfolioMultiply,
    session.state.positions,
    session.transactionHistory,
  ])

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="market-hero">
      {hideIdentity ? null : <MarketHeroIdentity detail={detail} leading={leading} actions={actions} />}

      <div className="pt-4" data-testid="market-hero-chart-card">
        <MarketHeroChart
          feed={feed}
          defaultRange="1M"
          gradientId={`multiplyHeroFill-${detail.id}`}
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

function TokenAvatar({ visual }: { visual: MultiplyMarketDetail["hero"]["visuals"][number] }) {
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

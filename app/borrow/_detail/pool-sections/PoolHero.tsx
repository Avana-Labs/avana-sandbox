"use client"

import * as React from "react"
import { BadgeCheck, Copy, Globe, MessageSquare, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { MarketHeroChart } from "@/app/components/charts"
import { getPoolHeroFeed } from "@/app/lib/chart-feeds"

type PoolHeroProps = {
  detail: PoolDetail
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
  const metaLabel = detail.hero.chain

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
  // Prefer the Convex-backed feed (TVL / total supplied); fall back to the local feed.
  const feed = React.useMemo(() => detail.heroFeed ?? getPoolHeroFeed(detail.id), [detail.heroFeed, detail.id])

  return (
    <section className={cn("flex flex-col gap-5", className)} data-testid="pool-hero">
      {hideIdentity ? null : <PoolHeroIdentity detail={detail} leading={leading} actions={actions} />}

      <div className="pt-4" data-testid="pool-hero-chart-card">
        {/* Convex feed carries the full daily history — open on it so the chart is rich. */}
        <MarketHeroChart feed={feed} defaultRange={detail.heroFeed ? "All" : "1D"} gradientId={`poolHeroFill-${detail.id}`} />
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

"use client"

import * as React from "react"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { EmbeddedActionPage } from "@/app/components/action-page/embedded-action-page"
import { getPoolById, type HomeAssetVisual, type HomeCollateralPool } from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"

type Props = {
  detail: PoolDetail
  className?: string
}

type SidebarTab = "pledge" | "remove" | "claim"

export function PoolBorrowSidebar({ detail, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col gap-12", className)}>
      <PoolActionRail detail={detail} className="mt-6" />
      <AboutNewsSection
        className="pt-4"
        about={detail.about}
        aboutTitle={`About ${detail.hero.name}`}
        compactAboutTitle
        newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
        newsImageLabel={detail.hero.name}
        mediaVariant="icon"
      />
    </div>
  )
}

export function PoolBorrowActions({ detail, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col gap-4", className)} aria-label={`Manage ${detail.hero.name}`}>
      <PoolActionRail detail={detail} />
    </div>
  )
}

function PoolActionRail({ detail, className }: Props) {
  const [tab, setTab] = React.useState<SidebarTab>("pledge")
  const session = useBorrowSessionContext()

  const pool = React.useMemo(
    () => session.collateralPools.find((entry) => entry.id === detail.id) ?? resolvePool(detail),
    [detail, session.collateralPools],
  )

  React.useEffect(() => {
    setTab("pledge")
  }, [detail.id])

  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <div className="space-y-4">
        <div role="tablist" aria-label="Pool actions" className="flex items-center gap-5 border-b border-border">
          {[
            { id: "pledge", label: "Pledge" },
            { id: "remove", label: "Remove" },
            { id: "claim", label: "Claim" },
          ].map((actionTab) => {
            const active = actionTab.id === tab
            return (
              <button
                key={actionTab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(actionTab.id as SidebarTab)}
                className={cn(
                  "border-b-[1.5px] -mb-px pb-4 text-[13px] font-medium transition-colors",
                  active
                    ? "border-accent-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {actionTab.label}
              </button>
            )
          })}
        </div>

        <div className="pt-1">
          {tab === "pledge" ? (
            <EmbeddedActionPage
              product="borrow"
              kind="supply"
              closeHref={`/borrow/pool/${detail.id}`}
              initialMarketId={pool.id}
            />
          ) : null}

          {tab === "remove" ? (
            <EmbeddedActionPage
              product="borrow"
              kind="remove"
              closeHref={`/borrow/pool/${detail.id}`}
              initialMarketId={pool.id}
              initialAmount="25"
            />
          ) : null}

          {tab === "claim" ? (
            <EmbeddedActionPage
              product="borrow"
              kind="claim"
              closeHref={`/borrow/pool/${detail.id}`}
              initialMarketId={pool.id}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}


function resolvePool(detail: PoolDetail): HomeCollateralPool {
  const fallback = getPoolById(detail.id)
  if (fallback && fallback.id === detail.id) return fallback
  return {
    id: detail.id,
    name: detail.hero.name,
    venue: detail.hero.venue,
    category: detail.hero.feeTier ?? detail.hero.venue,
    collateralUsd: detail.row.collateralExampleUsd,
    maxLtv: detail.row.ltv,
    borrowPowerUsd: Math.round(detail.row.collateralExampleUsd * (detail.row.ltv / 100)),
    liquidationUsd: Math.round(detail.row.collateralExampleUsd * ((detail.row.ltv + 10) / 100)),
    pairApr: (detail.row.aprMin + detail.row.aprMax) / 2,
    visuals: [toHomeVisual(detail.hero.visuals[0]), toHomeVisual(detail.hero.visuals[1])],
  }
}

function toHomeVisual(v: PoolDetail["hero"]["visuals"][number]): HomeAssetVisual {
  return {
    symbol: v.symbol,
    shortLabel: v.shortLabel,
    bgClassName: v.bgClass,
    textClassName: v.textClass,
  }
}

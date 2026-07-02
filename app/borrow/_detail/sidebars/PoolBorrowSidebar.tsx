"use client"

import * as React from "react"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { ResponsiveBorrowAction } from "@/app/components/action-page/responsive-borrow-action"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { getPoolById, type HomeAssetVisual, type HomeCollateralPool } from "@/app/lib/home-sim"
import { cn } from "@/lib/utils"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = {
  detail: PoolDetail
  className?: string
}

type SidebarTab = "pledge" | "remove" | "claim"

export function PoolBorrowSidebar({ detail, className }: Props) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex w-full flex-col gap-12", className)}>
      <PoolActionRail detail={detail} className="mt-6" embedActions />
      <AboutNewsSection
        className="pt-4"
        about={detail.about}
        aboutTitle={t("About {name}").replace("{name}", detail.hero.name)}
        compactAboutTitle
        newsImageUrl={detail.hero.visuals[0].iconUrl ?? detail.hero.visuals[1].iconUrl ?? undefined}
        newsImageLabel={detail.hero.name}
        mediaVariant="icon"
      />
    </div>
  )
}

export function PoolBorrowActions({ detail, className }: Props) {
  const { t } = useTranslation()
  return (
    <div className={cn("flex w-full flex-col gap-4", className)} aria-label={t("Manage {name}").replace("{name}", detail.hero.name)}>
      <PoolActionRail detail={detail} />
    </div>
  )
}

function PoolActionRail({ detail, className, embedActions = false }: Props & { embedActions?: boolean }) {
  const { t } = useTranslation()
  const [tab, setTab] = React.useState<SidebarTab>("pledge")
  const session = useBorrowSessionContext()
  const closeHref = `/borrow/markets/${detail.id}`

  const pool = React.useMemo(
    () => session.collateralPools.find((entry) => entry.id === detail.id) ?? resolvePool(detail),
    [detail, session.collateralPools],
  )

  React.useEffect(() => {
    setTab("pledge")
  }, [detail.id])

  return (
    <div className={cn("flex w-full flex-col", className)}>
        <ActionWorkspaceTabs
        items={[
          { id: "pledge", label: t("Pledge") },
          { id: "remove", label: t("Remove") },
          { id: "claim", label: t("Claim") },
        ]}
        value={tab}
        onChange={(value) => setTab(value as SidebarTab)}
        ariaLabel={t("Pool actions")}
      />

      <div className="mt-3">
          {tab === "pledge" ? (
            embedActions ? (
              <ResponsiveBorrowAction
                kind="supply"
                market={pool.id}
                closeHref={closeHref}
                sidebar
              />
            ) : (
              <ActionPageLaunchCta
                product="borrow"
                kind="supply"
                market={pool.id}
                returnTo={closeHref}
              />
            )
          ) : null}

          {tab === "remove" ? (
            embedActions ? (
              <ResponsiveBorrowAction
                kind="remove"
                market={pool.id}
                closeHref={closeHref}
                sidebar
              />
            ) : (
              <ActionPageLaunchCta
                product="borrow"
                kind="remove"
                market={pool.id}
                returnTo={closeHref}
              />
            )
          ) : null}

          {tab === "claim" ? (
            embedActions ? (
              <ResponsiveBorrowAction kind="claim" market={pool.id} closeHref={closeHref} sidebar />
            ) : (
              <ActionPageLaunchCta product="borrow" kind="claim" market={pool.id} returnTo={closeHref} />
            )
          ) : null}
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

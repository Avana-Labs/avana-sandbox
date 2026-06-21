"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { EmbeddedActionPage } from "@/app/components/action-page/embedded-action-page"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { CompactClaimCard } from "@/app/components/home/claim-card"
import {
  buildHomeClaimPreview,
  selectRewardClaimableTotals,
} from "@/app/lib/borrow-system/modal-preview-runtime"
import {
  HOME_INITIAL_DEBTS,
  getPoolById,
  type HomeAssetVisual,
  type HomeClaimPosition,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getBorrowSessionWalletId } from "@/app/lib/borrow-system/demo-session"
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
  const router = useRouter()
  const [tab, setTab] = React.useState<SidebarTab>("pledge")
  const [claimAmount, setClaimAmount] = React.useState("")
  const walletId = React.useMemo(() => getBorrowSessionWalletId(), [])
  const session = useBorrowSessionContext()

  const pool = React.useMemo(
    () => session.collateralPools.find((entry) => entry.id === detail.id) ?? resolvePool(detail),
    [detail, session.collateralPools],
  )
  const claimPosition = React.useMemo(() => resolveClaimPosition(detail, pool), [detail, pool])
  const claimableTotals = React.useMemo(
    () => selectRewardClaimableTotals(session.state, walletId),
    [session.state, walletId],
  )
  const claimSelections = React.useMemo(() => ({ [claimPosition.id]: true }), [claimPosition.id])
  const claimPositions = React.useMemo(() => [claimPosition], [claimPosition])
  const claimPreview = React.useMemo(
    () => buildHomeClaimPreview(session.state, walletId, claimPositions, claimSelections, Number.parseFloat(claimAmount) || null),
    [claimAmount, claimPositions, claimSelections, session.state, walletId],
  )

  React.useEffect(() => {
    setClaimAmount("")
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
            <div className="space-y-3">
              <CompactClaimCard
                amount={claimAmount}
                positions={claimPositions}
                preview={claimPreview}
                claimableTotals={claimableTotals}
                selections={claimSelections}
                submitLabel="Review claim"
                onToggleSelection={() => {}}
                onAmountChange={setClaimAmount}
                onSetAll={() => setClaimAmount(claimPreview.selectedTotalUsd.toFixed(2))}
                onSubmit={() => router.push(actionPagePath("borrow", "claim", { market: pool.id }))}
              />
            </div>
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

function resolveClaimPosition(detail: PoolDetail, pool: HomeCollateralPool): HomeClaimPosition {
  const totalUsd = Math.max(24, Math.round(pool.pairApr * 12))
  return {
    id: `claim-${pool.id}`,
    poolId: pool.id,
    name: detail.hero.name,
    subtitle: `${detail.hero.venue} · ${detail.hero.feeTier ?? detail.hero.chain}`,
    totalUsd,
    breakdown: [
      {
        id: `${pool.id}-${detail.hero.visuals[0].symbol.toLowerCase()}`,
        symbol: detail.hero.visuals[0].symbol,
        amountLabel: `${(totalUsd * 0.55).toFixed(2)} ${detail.hero.visuals[0].symbol}`,
        usdValue: Number((totalUsd * 0.55).toFixed(2)),
        visual: toHomeVisual(detail.hero.visuals[0]),
      },
      {
        id: `${pool.id}-${detail.hero.visuals[1].symbol.toLowerCase()}`,
        symbol: detail.hero.visuals[1].symbol,
        amountLabel: `${(totalUsd * 0.45).toFixed(2)} ${detail.hero.visuals[1].symbol}`,
        usdValue: Number((totalUsd * 0.45).toFixed(2)),
        visual: toHomeVisual(detail.hero.visuals[1]),
      },
    ],
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

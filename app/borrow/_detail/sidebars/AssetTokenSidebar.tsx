"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { ResponsiveBorrowAction } from "@/app/components/action-page/responsive-borrow-action"
import { ActionWorkspaceTabs } from "@/app/components/action-page/action-workspace-tabs"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { HomeAssetVisual, HomeCollateralPool } from "@/app/lib/borrow-system/home-contracts"
import type { BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/app/lib/i18n/use-translation"

type Props = { detail: AssetDetail; className?: string }

type SidebarTab = "borrow" | "repay"

export function AssetTokenSidebar({ detail, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col gap-12", className)}>
      <TokenRail detail={detail} className="mt-6" embedActions />
    </div>
  )
}

export function AssetTokenActions({ detail, className }: Props) {
  return <TokenRail detail={detail} className={className} />
}

function TokenRail({
  detail,
  className,
  embedActions = false,
}: {
  detail: AssetDetail
  className?: string
  embedActions?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  // This is a Borrow-section asset detail page, so the primary action must be a
  // borrow flow — not the Lend deposit that the "deposit" tab launches.
  const [tab, setTab] = React.useState<SidebarTab>("borrow")
  const [depositPromptOpen, setDepositPromptOpen] = React.useState(false)
  const closeHref = `/borrow/assets/${detail.row.id}`
  const session = useBorrowSessionContext()
  const fallbackMarket = React.useMemo(
    () => session.marketSummaries.find((market) => detail.row.marketIds.includes(market.id)) ?? null,
    [detail.row.marketIds, session.marketSummaries],
  )
  const borrowContext = React.useMemo<HomeCollateralPool | null>(() => {
    const suppliedPool = session.collateralPools.find((pool) => detail.row.marketIds.includes(pool.id))
    if (suppliedPool) return suppliedPool
    return fallbackMarket ? toHomeCollateralPool(fallbackMarket) : null
  }, [detail.row.marketIds, fallbackMarket, session.collateralPools])
  const canBorrowFromSession = Boolean(
    borrowContext && session.collateralPools.some((pool) => pool.id === borrowContext.id),
  )

  React.useEffect(() => {
    setTab("borrow")
  }, [detail.id])

  return (
    <>
      <div className={cn("flex w-full flex-col", className)}>
        <ActionWorkspaceTabs
          items={[
            { id: "borrow", label: t("Borrow") },
            { id: "repay", label: t("Repay") },
          ]}
          value={tab}
          onChange={(value) => setTab(value as SidebarTab)}
          ariaLabel={t("Asset actions")}
          withIcons
          revealLabels
        />

        <div className="mt-3">
          {tab === "borrow" ? (
            canBorrowFromSession && borrowContext ? (
              embedActions ? (
                <ResponsiveBorrowAction
                  kind="borrow"
                  market={borrowContext.id}
                  asset={detail.row.id}
                  closeHref={closeHref}
                  sidebar
                />
              ) : (
                <ActionPageLaunchCta
                  product="borrow"
                  kind="borrow"
                  market={borrowContext.id}
                  asset={detail.row.id}
                  returnTo={closeHref}
                />
              )
            ) : (
              <div className="rounded-radius-md border border-border bg-surface-raised px-5 py-4">
                <p className="text-[15px] leading-6 text-muted-foreground">
                  {t("Deposit LP collateral before borrowing {symbol}.").replace("{symbol}", detail.hero.symbol)}
                </p>
                <Button
                  type="button"
                  className="mt-4 h-11 rounded-radius-lg bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
                  onClick={() => setDepositPromptOpen(true)}
                  disabled={!fallbackMarket}
                >
                  {t("Pledge")}
                </Button>
              </div>
            )
          ) : null}

          {tab === "repay" && borrowContext ? (
            embedActions ? (
              <ResponsiveBorrowAction
                kind="repay"
                market={borrowContext.id}
                asset={detail.row.id}
                closeHref={closeHref}
                sidebar
              />
            ) : (
              <ActionPageLaunchCta
                product="borrow"
                kind="repay"
                market={borrowContext.id}
                asset={detail.row.id}
                returnTo={closeHref}
              />
            )
          ) : null}
        </div>
      </div>

      <Dialog open={depositPromptOpen} onOpenChange={setDepositPromptOpen}>
        <DialogContent className="max-w-sm rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3">
          <DialogTitle className="sr-only">{t("Deposit collateral first")}</DialogTitle>
          <div className="space-y-4 px-6 pb-6 pt-5">
            <div className="space-y-2">
              <h3 className="text-[22px] font-medium tracking-[-0.03em] text-foreground">
                {t("You need to deposit an asset before you can borrow.")}
              </h3>
              <p className="text-[14px] leading-6 text-muted-foreground">
                {t("To borrow {symbol}, deposit LP collateral first.").replace("{symbol}", detail.hero.symbol)}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 rounded-radius-lg bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
                onClick={() => {
                  setDepositPromptOpen(false)
                  if (fallbackMarket) {
                    router.push(actionPagePath("borrow", "supply", { market: fallbackMarket.id, return: closeHref }))
                  }
                }}
                disabled={!fallbackMarket}
              >
                {t("Pledge")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-11 rounded-radius-lg"
                onClick={() => setDepositPromptOpen(false)}
              >
                {t("Got it")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function toHomeCollateralPool(row: BorrowPoolRow): HomeCollateralPool {
  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    category: row.feeTier,
    collateralUsd: row.collateralExampleUsd,
    maxLtv: row.ltv,
    borrowPowerUsd: Math.round(row.collateralExampleUsd * (row.ltv / 100)),
    liquidationUsd: Math.round(row.collateralExampleUsd * ((row.ltv + 10) / 100)),
    pairApr: (row.aprMin + row.aprMax) / 2,
    visuals: row.visuals.map((visual) => ({
      symbol: visual.symbol,
      shortLabel: visual.shortLabel,
      bgClassName: visual.bgClass,
      textClassName: visual.textClass,
    })) as [HomeAssetVisual, HomeAssetVisual],
  }
}

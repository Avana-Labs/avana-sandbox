"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { EmbeddedActionPage } from "@/app/components/action-page/embedded-action-page"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { useBorrowSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import type { HomeAssetVisual, HomeCollateralPool } from "@/app/lib/home-sim"
import type { BorrowPoolRow } from "@/app/lib/data/borrow-domain"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = { detail: AssetDetail; className?: string }

type SidebarTab = "deposit" | "withdraw" | "borrow" | "repay"

export function AssetTokenSidebar({ detail, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col gap-12", className)}>
      <TokenRail detail={detail} className="mt-6" />
      <AboutNewsSection
        className="pt-4"
        about={detail.about}
        aboutTitle={`About ${detail.hero.name}`}
        compactAboutTitle
        newsImageUrl={detail.hero.visual.iconUrl ?? undefined}
        newsImageLabel={detail.hero.symbol}
        mediaVariant="icon"
      />
    </div>
  )
}

export function AssetTokenActions({ detail, className }: Props) {
  return <TokenRail detail={detail} className={className} />
}

function TokenRail({ detail, className }: { detail: AssetDetail; className?: string }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<SidebarTab>("deposit")
  const [depositPromptOpen, setDepositPromptOpen] = React.useState(false)
  const lendMarketId = React.useMemo(() => resolveLendMarketId(detail.hero.symbol), [detail.hero.symbol])
  const closeHref = `/borrow/asset/${detail.row.id}`
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
    setTab("deposit")
  }, [detail.id])

  return (
    <>
      <div className={cn("flex w-full flex-col gap-6", className)}>
        <div className="space-y-4">
          <div role="tablist" aria-label="Asset actions" className="flex items-center gap-5 border-b border-border">
            {[
              { id: "deposit", label: "Deposit" },
              { id: "withdraw", label: "Withdraw" },
              { id: "borrow", label: "Borrow" },
              { id: "repay", label: "Repay" },
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
                    "pb-4 text-[13px] font-medium transition-colors border-b-[1.5px] -mb-px",
                    active
                      ? "text-foreground border-accent-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground",
                  )}
                >
                  {actionTab.label}
                </button>
              )
            })}
          </div>

          <div className="pt-1">
            {tab === "deposit" ? (
              <EmbeddedActionPage product="lend" kind="deposit" closeHref={closeHref} initialMarketId={lendMarketId} />
            ) : null}

            {tab === "withdraw" ? (
              <EmbeddedActionPage product="lend" kind="withdraw" closeHref={closeHref} initialMarketId={lendMarketId} />
            ) : null}

            {tab === "borrow" ? (
              canBorrowFromSession && borrowContext ? (
                <EmbeddedActionPage
                  product="borrow"
                  kind="borrow"
                  closeHref={closeHref}
                  initialMarketId={borrowContext.id}
                  initialAssetId={detail.row.id}
                />
              ) : (
                <div className="rounded-radius-md border border-border bg-surface-raised px-5 py-4">
                  <p className="text-[15px] leading-6 text-muted-foreground">
                    Deposit compatible collateral from {detail.row.spokeLabel} before borrowing {detail.hero.symbol}.
                  </p>
                  <Button
                    type="button"
                    className="mt-4 h-11 rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
                    onClick={() => setDepositPromptOpen(true)}
                    disabled={!fallbackMarket}
                  >
                    Deposit collateral
                  </Button>
                </div>
              )
            ) : null}

            {tab === "repay" && borrowContext ? (
              <EmbeddedActionPage
                product="borrow"
                kind="repay"
                closeHref={closeHref}
                initialMarketId={borrowContext.id}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={depositPromptOpen} onOpenChange={setDepositPromptOpen}>
        <DialogContent className="max-w-sm rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3">
          <DialogTitle className="sr-only">Deposit collateral first</DialogTitle>
          <div className="space-y-4 px-6 pb-6 pt-5">
            <div className="space-y-2">
              <h3 className="text-[22px] font-medium tracking-[-0.03em] text-foreground">
                You need to deposit an asset before you can borrow.
              </h3>
              <p className="text-[14px] leading-6 text-muted-foreground">
                To borrow {detail.hero.symbol}, deposit a compatible collateral market from {detail.row.spokeLabel} first.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
                onClick={() => {
                  setDepositPromptOpen(false)
                  if (fallbackMarket) {
                    router.push(actionPagePath("borrow", "supply", { market: fallbackMarket.id }))
                  }
                }}
                disabled={!fallbackMarket}
              >
                Deposit
              </Button>
              <Button type="button" variant="secondary" className="h-11 rounded-2xl" onClick={() => setDepositPromptOpen(false)}>
                Got it
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

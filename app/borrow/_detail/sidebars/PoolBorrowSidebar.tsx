"use client"

import * as React from "react"
import { toast } from "sonner"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import { parseFixed } from "@/app/lib/credit-engine"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { SupplyCollateralModal } from "@/app/borrow/components/supply-collateral-modal"
import { RepayRemoveModal } from "@/app/borrow/components/repay-remove-modal"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import { CompactClaimCard } from "@/app/components/home/claim-card"
import { CompactRemoveCard } from "@/app/components/home/remove-card"
import { PairVisual } from "@/app/components/home-workspace-primitives"
import {
  HOME_INITIAL_CLAIMABLE_TOTALS,
  HOME_INITIAL_DEBTS,
  calculateClaimPreview,
  calculateRemovePreview,
  formatCompactUsd,
  formatUsd,
  getClaimBreakdownLabel,
  getPoolById,
  type HomeAssetVisual,
  type HomeClaimPosition,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildBorrowSessionSeed, getBorrowSessionWalletId } from "@/app/lib/borrow-system/demo-session"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"

type Props = {
  detail: PoolDetail
  className?: string
}

type SidebarTab = "pledge" | "remove" | "claim"
type ClaimStage = "entry" | TransactionFlowStage

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
  const [removePercent, setRemovePercent] = React.useState(25)
  const [claimAmount, setClaimAmount] = React.useState("")
  const [claimStage, setClaimStage] = React.useState<ClaimStage>("entry")
  const [supplyOpen, setSupplyOpen] = React.useState(false)
  const [removeOpen, setRemoveOpen] = React.useState(false)
  const [claimOpen, setClaimOpen] = React.useState(false)
  const walletId = React.useMemo(() => getBorrowSessionWalletId(), [])
  const sessionSeed = React.useMemo(() => buildBorrowSessionSeed(walletId), [walletId])
  const session = useBorrowSession({ walletId, sessionSeed })

  const pool = React.useMemo(
    () => session.collateralPools.find((entry) => entry.id === detail.id) ?? resolvePool(detail),
    [detail, session.collateralPools],
  )
  const currentDebtUsd = React.useMemo(
    () => session.initialDebts[pool.id] ?? resolveCurrentDebtUsd(pool.id, pool.borrowPowerUsd),
    [pool.borrowPowerUsd, pool.id, session.initialDebts],
  )
  const claimPosition = React.useMemo(() => resolveClaimPosition(detail, pool), [detail, pool])

  const claimableTotals = React.useMemo(
    () => ({ [claimPosition.id]: HOME_INITIAL_CLAIMABLE_TOTALS[claimPosition.id] ?? claimPosition.totalUsd }),
    [claimPosition],
  )
  const claimSelections = React.useMemo(() => ({ [claimPosition.id]: true }), [claimPosition.id])
  const claimPositions = React.useMemo(() => [claimPosition], [claimPosition])
  const claimPreview = React.useMemo(
    () => calculateClaimPreview(claimPositions, claimableTotals, claimSelections, Number.parseFloat(claimAmount) || null),
    [claimAmount, claimPositions, claimSelections, claimableTotals],
  )
  const removePreview = React.useMemo(
    () => calculateRemovePreview(pool, currentDebtUsd, removePercent),
    [currentDebtUsd, pool, removePercent],
  )

  React.useEffect(() => {
    setRemovePercent(25)
    setClaimAmount("")
    setClaimStage("entry")
  }, [detail.id])

  React.useEffect(() => {
    if (!claimOpen) {
      setClaimStage("entry")
      return
    }
    if (claimStage !== "processing") return

    const timer = window.setTimeout(() => {
      setClaimStage("success")
      toast.success(`Claimed ${formatUsd(claimPreview.effectiveClaimUsd)} in fees`)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [claimOpen, claimPreview.effectiveClaimUsd, claimStage])

  const claimRows = React.useMemo(
    () =>
      Object.entries(claimPreview.tokenTotals)
        .filter(([, value]) => value > 0)
        .map(([symbol, value]) => ({
          label: `${symbol} received`,
          value: getClaimBreakdownLabel(symbol, value),
          tone: "positive" as const,
        })),
    [claimPreview.tokenTotals],
  )

  return (
    <>
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
              <PledgeCard pool={pool} onSubmit={() => setSupplyOpen(true)} />
            ) : null}

            {tab === "remove" ? (
              <CompactRemoveCard
                pool={pool}
                percent={removePercent}
                preview={removePreview}
                submitLabel="Review removal"
                flatHero
                onOpenPoolDialog={() => {}}
                onPercentChange={setRemovePercent}
                onSubmit={() => setRemoveOpen(true)}
              />
            ) : null}

            {tab === "claim" ? (
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
                onSubmit={() => setClaimOpen(true)}
              />
            ) : null}
          </div>
        </div>
      </div>

      <SupplyCollateralModal
        open={supplyOpen}
        context={{ pool: toBorrowPoolRow(detail) }}
        onClose={() => setSupplyOpen(false)}
        onConfirm={(result) => {
          session.dispatch({
            type: "supplyCollateral",
            walletId,
            marketId: result.pool.id,
            amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
          })
        }}
      />

      <RepayRemoveModal
        open={removeOpen}
        context={{
          pool,
          currentDebtUsd,
          mode: "remove",
        }}
        onClose={() => setRemoveOpen(false)}
        onConfirm={(result) => {
          const position = session.state.accounts[walletId]?.collateralPositions.find((entry) => entry.marketId === result.pool.id)
          if (!position) return
          session.dispatch({
            type: "removeCollateral",
            walletId,
            positionId: position.id,
            amountUsd6: parseFixed(result.amountUsd.toFixed(6), 6),
          })
        }}
      />

      <Dialog
        open={claimOpen}
        onOpenChange={(next) => {
          if (!next && claimStage !== "processing") {
            setClaimOpen(false)
            setClaimStage("entry")
          }
        }}
      >
        <DialogContent
          fullScreenOnMobile
          hideMobileHandle
          className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
        >
          <DialogTitle className="sr-only">Claim fees</DialogTitle>
          {claimStage === "entry" ? (
            <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
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
                  onSubmit={() => setClaimStage("review")}
                />
              </div>
            </div>
          ) : (
            <TransactionFlowPanel
              stage={claimStage}
              actionLabel="claim"
              amountLabel={formatUsd(claimPreview.effectiveClaimUsd)}
              title="Claim successful"
              subtitle="Fees claimed."
              visual={
                <div className="flex items-center">
                  <span className="scale-[1.8]">
                    <PairVisual visuals={pool.visuals} className="w-10" />
                  </span>
                </div>
              }
              rows={claimRows}
              footerNote={undefined}
              primaryLabel={claimStage === "review" ? "Claim fees" : claimStage === "approve" ? "Approve wallet" : "Done"}
              onPrimary={() => {
                if (claimStage === "review") {
                  setClaimStage("approve")
                } else if (claimStage === "approve") {
                  setClaimStage("processing")
                } else {
                  setClaimOpen(false)
                  setClaimStage("entry")
                  setClaimAmount("")
                }
              }}
              onBack={() => setClaimStage("entry")}
              onClose={() => {
                if (claimStage === "processing") return
                setClaimOpen(false)
                setClaimStage("entry")
              }}
              className="rounded-none border-0 bg-transparent shadow-none"
              variant="bare"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function PledgeCard({ pool, onSubmit }: { pool: HomeCollateralPool; onSubmit: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex flex-col divide-y divide-border overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
        <div className="px-5 py-4">
          <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))]">Collateral</span>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{formatCompactUsd(pool.collateralUsd)}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{pool.name}</div>
            </div>
            <span className="inline-flex h-7 items-center rounded-xs border border-border bg-surface-inset px-2 text-foreground">
              <PairVisual visuals={pool.visuals} className="w-10" />
            </span>
          </div>
        </div>

        <div className="px-5 py-4">
          <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))]">Pledge</span>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[28px] font-medium tracking-tight text-foreground">{formatCompactUsd(pool.borrowPowerUsd)}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">Borrow power unlocked at {pool.maxLtv}% max LTV</div>
            </div>
            <span className="text-[11.5px] text-muted-foreground">{pool.pairApr.toFixed(1)}% LP APY</span>
          </div>
        </div>
      </div>

      <Button
        type="button"
        className="h-11 rounded-2xl bg-[hsl(var(--brand))] text-base text-white hover:bg-[hsl(var(--brand))]/90"
        onClick={onSubmit}
      >
        Review pledge
      </Button>
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

function resolveCurrentDebtUsd(poolId: string, borrowPowerUsd: number) {
  return HOME_INITIAL_DEBTS[poolId] ?? Math.round(borrowPowerUsd * 0.45)
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

function toBorrowPoolRow(detail: PoolDetail) {
  return detail.row
}

function toHomeVisual(v: PoolDetail["hero"]["visuals"][number]): HomeAssetVisual {
  return {
    symbol: v.symbol,
    shortLabel: v.shortLabel,
    bgClassName: v.bgClass,
    textClassName: v.textClass,
  }
}

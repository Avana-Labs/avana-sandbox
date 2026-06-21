"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { currentDebtValueUsd6, formatFixed } from "@/app/lib/credit-engine"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { resolveLendMarketId } from "@/app/lib/lend-system/catalog"
import { CompactRepayCard } from "@/app/components/home/repay-card"
import { TokenIcon } from "@/app/components/token-icon"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import { getBorrowSessionWalletId } from "@/app/lib/borrow-system/demo-session"
import { useBorrowSessionContext, useLendSessionContext } from "@/app/lib/avana-session/avana-sessions-provider"
import { buildHomeRepayPreview } from "@/app/lib/borrow-system/modal-preview-runtime"
import type { HomeBorrowToken, HomeCollateralPool, HomeAssetVisual } from "@/app/lib/home-sim"
import type { BorrowPoolRow, BorrowableAsset } from "@/app/lib/data/borrow-domain"
import { PickerSurface, PrimaryCardButton } from "@/app/components/home/shared"
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
  const [amount, setAmount] = React.useState("")
  const marketId = React.useMemo(() => resolveLendMarketId(detail.hero.symbol), [detail.hero.symbol])
  const [depositPromptOpen, setDepositPromptOpen] = React.useState(false)
  const walletId = React.useMemo(() => getBorrowSessionWalletId(), [])
  const session = useBorrowSessionContext()
  const lendSession = useLendSessionContext()

  const lendPosition = React.useMemo(
    () =>
      Object.values(lendSession.state.positions).find(
        (entry) => entry.walletId === lendSession.walletId && entry.marketId === marketId && entry.status === "active",
      ),
    [lendSession.state.positions, lendSession.walletId, marketId],
  )
  const supplyApy = parseFloat(String(detail.row.borrowApr)) || 0
  const fallbackMarket = React.useMemo(
    () => session.marketSummaries.find((market) => detail.row.marketIds.includes(market.id)) ?? null,
    [detail.row.marketIds, session.marketSummaries],
  )
  const borrowContext = React.useMemo<HomeCollateralPool | null>(() => {
    const suppliedPool = session.collateralPools.find((pool) => detail.row.marketIds.includes(pool.id))
    if (suppliedPool) return suppliedPool
    return fallbackMarket ? toHomeCollateralPool(fallbackMarket) : null
  }, [detail.row.marketIds, fallbackMarket, session.collateralPools])
  const borrowTokenId = detail.row.id
  const currentDebtPosition = React.useMemo(
    () => session.state.accounts[walletId]?.debtPositions.find((position) => position.assetId === detail.row.id) ?? null,
    [detail.row.id, session.state.accounts, walletId],
  )
  const repayDebtUsd = React.useMemo(
    () => (currentDebtPosition ? Number.parseFloat(formatFixed(currentDebtValueUsd6(currentDebtPosition), 6)) : 0),
    [currentDebtPosition],
  )
  const repayPreview = React.useMemo(
    () => buildHomeRepayPreview(session.state, walletId, currentDebtPosition?.id ?? null, Number.parseFloat(amount) || 0),
    [amount, currentDebtPosition?.id, session.state, walletId],
  )
  const repayPool = React.useMemo<HomeCollateralPool>(
    () => borrowContext ?? (fallbackMarket ? toHomeCollateralPool(fallbackMarket) : makeEmptyHomeCollateralPool(detail)),
    [borrowContext, detail, fallbackMarket],
  )
  const borrowAprLabel =
    detail.quickStats.find((stat) => stat.id === "borrowApy")?.value ?? `${detail.row.borrowApr.toFixed(2)}%`
  const canBorrowFromSession = Boolean(
    borrowContext && session.collateralPools.some((pool) => pool.id === borrowContext.id),
  )

  const tokenBalance = lendPosition?.currentSuppliedAmount ?? 0
  const tokenPrice = 1
  const parsedAmount = Number.parseFloat(amount) || 0
  const exceedsBalance = tab === "withdraw" && parsedAmount > tokenBalance
  const isInvalidAmount = !parsedAmount || parsedAmount <= 0
  const primaryLabel =
    isInvalidAmount
      ? "Enter an amount"
      : exceedsBalance
        ? "Exceeds balance"
        : tab === "deposit"
          ? "Review deposit"
          : tab === "withdraw"
            ? "Review withdrawal"
            : tab === "borrow"
              ? "Review borrow"
              : "Review repayment"

  const openLend = (action: "deposit" | "withdraw") => {
    router.push(actionPagePath("lend", action, amount ? { market: marketId, amount } : { market: marketId }))
  }

  const openBorrow = () => {
    if (!borrowContext) return
    router.push(
      actionPagePath(
        "borrow",
        "borrow",
        amount
          ? { market: borrowContext.id, asset: borrowTokenId, amount }
          : { market: borrowContext.id, asset: borrowTokenId },
      ),
    )
  }

  const openRepay = () => {
    if (!borrowContext) return
    router.push(actionPagePath("borrow", "repay", amount ? { market: borrowContext.id, amount } : { market: borrowContext.id }))
  }

  const openSupply = () => {
    if (!fallbackMarket) return
    router.push(actionPagePath("borrow", "supply", amount ? { market: fallbackMarket.id, amount } : { market: fallbackMarket.id }))
  }

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
                  onClick={() => {
                    setTab(actionTab.id as SidebarTab)
                    setAmount("")
                  }}
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

          <div className="flex flex-col gap-3 pt-1">
            {tab === "repay" ? (
              <CompactRepayCard
                pool={repayPool}
                token={toDetailBorrowToken(detail)}
                debtUsd={repayDebtUsd}
                amount={amount}
                preview={repayPreview}
                submitLabel={primaryLabel}
                flatHero
                onOpenPoolDialog={() => {}}
                onAmountChange={setAmount}
                onSetMax={() => setAmount(String(repayDebtUsd))}
                onSubmit={openRepay}
              />
            ) : (
              <>
                <div className="relative flex flex-col divide-y divide-border overflow-hidden rounded-radius-md border border-border bg-surface-raised shadow-elev-1">
                  <PickerSurface label={tab === "borrow" ? "Asset" : "Market"} tier="top" seamless>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-data text-[20px] font-medium tracking-tight text-foreground">
                          {tab === "borrow" ? detail.hero.symbol : detail.row.walletBalanceLabel}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                          {tab === "borrow"
                            ? detail.hero.name
                            : tab === "deposit"
                              ? `${supplyApy.toFixed(2)}% supply APY`
                              : `${tokenBalance.toLocaleString()} available`}
                        </div>
                      </div>
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-inset px-2 text-foreground">
                        <TokenIcon symbol={detail.hero.symbol} size="sm" />
                        <span className="text-[12px] font-medium">{detail.hero.symbol}</span>
                      </span>
                    </div>
                  </PickerSurface>

                  <PickerSurface
                    label={tab === "deposit" ? "Deposit" : tab === "withdraw" ? "Withdraw" : "Borrow"}
                    tier="bottom"
                    seamless
                    footer={
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {tab === "borrow"
                            ? `${borrowAprLabel} borrow APY`
                            : tab === "deposit"
                              ? `${supplyApy.toFixed(2)}% supply APY`
                              : `${tokenBalance.toLocaleString()} available`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (tab === "withdraw") {
                              setAmount(tokenBalance.toString())
                              return
                            }
                            if (tab === "borrow") {
                              setAmount(String(Math.round(borrowContext?.borrowPowerUsd ?? 0)))
                              return
                            }
                            setAmount("0")
                          }}
                          className="inline-flex min-h-10 items-center rounded-full px-2 text-[11.5px] font-medium text-foreground/70 underline-offset-2 transition-colors hover:bg-surface-inset hover:text-foreground hover:underline"
                        >
                          Max
                        </button>
                      </div>
                    }
                  >
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex min-w-0 flex-1 flex-col">
                        <span className="sr-only">{tab} amount</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={amount}
                          onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                          className="no-number-spinner w-full bg-transparent font-data text-[28px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
                        />
                        <span className="text-[11px] text-muted-foreground">{amount ? `≈ $${(parsedAmount * tokenPrice).toFixed(2)}` : "$0"}</span>
                      </label>
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-border bg-surface-raised px-2 text-[12px] font-medium text-foreground">
                        <TokenIcon symbol={detail.hero.symbol} size="sm" />
                        {detail.hero.symbol}
                      </span>
                    </div>
                  </PickerSurface>
                </div>

                <PrimaryCardButton
                  disabled={isInvalidAmount || exceedsBalance}
                  onClick={() => {
                    if (tab === "borrow") {
                      if (!canBorrowFromSession) {
                        setDepositPromptOpen(true)
                        return
                      }
                      openBorrow()
                      return
                    }
                    openLend(tab)
                  }}
                >
                  {primaryLabel}
                </PrimaryCardButton>
              </>
            )}
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
                  openSupply()
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

function toBorrowToken(asset: Partial<BorrowableAsset> & { id: string; borrowApr: number }): HomeBorrowToken {
  const symbol = asset.symbol ?? "TOKEN"
  const name = asset.name ?? symbol

  return {
    id: asset.id,
    name,
    symbol,
    subtitle: asset.subtitle ?? name,
    borrowApr: asset.borrowApr,
    visual: {
      symbol: asset.visual?.symbol ?? symbol,
      shortLabel: asset.visual?.shortLabel ?? symbol,
      bgClassName: asset.visual?.bgClass ?? "bg-slate-900",
      textClassName: asset.visual?.textClass ?? "text-white",
    },
  }
}

function toDetailBorrowToken(detail: AssetDetail): HomeBorrowToken {
  return {
    id: detail.row.id,
    name: detail.hero.name,
    symbol: detail.hero.symbol,
    subtitle: detail.row.spokeLabel,
    borrowApr: detail.row.borrowApr,
    visual: {
      symbol: detail.hero.symbol,
      shortLabel: detail.hero.visual.shortLabel ?? detail.hero.symbol,
      bgClassName: detail.hero.visual.bgClass ?? "bg-slate-900",
      textClassName: detail.hero.visual.textClass ?? "text-white",
    },
  }
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

function makeEmptyHomeCollateralPool(detail: AssetDetail): HomeCollateralPool {
  const fallbackVisual: HomeAssetVisual = {
    symbol: detail.hero.symbol,
    shortLabel: detail.hero.visual.shortLabel ?? detail.hero.symbol,
    bgClassName: detail.hero.visual.bgClass ?? "bg-slate-900",
    textClassName: detail.hero.visual.textClass ?? "text-white",
  }

  return {
    id: detail.id,
    name: detail.hero.name,
    venue: detail.row.spokeLabel,
    category: detail.row.spokeLabel,
    collateralUsd: 0,
    maxLtv: 0,
    borrowPowerUsd: 0,
    liquidationUsd: 0,
    pairApr: 0,
    visuals: [fallbackVisual, fallbackVisual],
  }
}

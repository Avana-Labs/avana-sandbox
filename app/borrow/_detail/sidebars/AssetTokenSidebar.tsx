"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection } from "@/app/borrow/_detail/ui"
import { BorrowModal } from "@/app/borrow/components/borrow-modal"
import { LendModals } from "@/app/lend/components/lend-modals"
import { MARKETS, TOKENS } from "@/app/lend/components/data"
import { TokenIcon } from "@/app/components/token-icon"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import { HOME_BORROW_TOKENS, HOME_COLLATERAL_POOLS } from "@/app/lib/home-sim"
import { PickerSurface, PrimaryCardButton } from "@/app/components/home/shared"

type Props = { detail: AssetDetail; className?: string }

type SidebarTab = "deposit" | "withdraw" | "borrow"
type LendToken = (typeof TOKENS)[number] | (typeof MARKETS)[number]
type ModalState = {
  isOpen: boolean
  type: "deposit" | "withdraw" | "success"
  actionType: "deposit" | "withdraw"
  token: LendToken | null
  amount: string
}

const INITIAL_MODAL: ModalState = {
  isOpen: false,
  type: "deposit",
  actionType: "deposit",
  token: null,
  amount: "",
}

export function AssetTokenSidebar({ detail, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col gap-12", className)}>
      <TokenRail detail={detail} />
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
  const [tab, setTab] = React.useState<SidebarTab>("deposit")
  const [amount, setAmount] = React.useState("")
  const [modalState, setModalState] = React.useState<ModalState>(INITIAL_MODAL)
  const [borrowOpen, setBorrowOpen] = React.useState(false)

  const token = React.useMemo(() => toLendToken(detail), [detail])
  const borrowContext = React.useMemo(() => resolveBorrowContext(detail), [detail])
  const borrowTokenId = React.useMemo(() => resolveBorrowTokenId(detail), [detail])
  const borrowAprLabel =
    detail.quickStats.find((stat) => stat.id === "borrowApy")?.value ?? `${detail.row.borrowApr.toFixed(2)}%`

  const tokenBalance = "balance" in token ? token.balance : 0
  const tokenPrice = "price" in token ? token.price : 1
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
            : "Review borrow"

  const openLend = (action: "deposit" | "withdraw") => {
    setModalState({
      isOpen: true,
      type: action,
      actionType: action,
      token,
      amount,
    })
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
                          ? `${token.apy.toFixed(2)}% supply APY`
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
                          ? `${token.apy.toFixed(2)}% supply APY`
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
                          setAmount(String(Math.round(borrowContext.borrowPowerUsd)))
                          return
                        }
                        setAmount("0")
                      }}
                      className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
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
                  setBorrowOpen(true)
                  return
                }
                openLend(tab)
              }}
            >
              {primaryLabel}
            </PrimaryCardButton>

          </div>
        </div>
      </div>

      <LendModals
        modalState={modalState}
        setModalState={setModalState}
        closeModal={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      <BorrowModal
        open={borrowOpen}
        context={{
          pool: borrowContext,
          currentDebtUsd: 0,
          defaultTokenId: borrowTokenId,
        }}
        initialAmount={amount}
        initialTokenId={borrowTokenId}
        startStage={amount ? "review" : "entry"}
        onClose={() => setBorrowOpen(false)}
        onConfirm={() => setBorrowOpen(false)}
      />
    </>
  )
}

function toLendToken(detail: AssetDetail): LendToken {
  const catalog = TOKENS.find((t) => t.symbol.toLowerCase() === detail.hero.symbol.toLowerCase())
  if (catalog) return catalog
  const base = TOKENS[0]
  const apy = Number.parseFloat(String(detail.row.borrowApr)) || base.apy
  return {
    ...base,
    symbol: detail.hero.symbol,
    name: detail.hero.name,
    apy,
    balance: 0,
    earned: 0,
    daily: 0,
  } as unknown as LendToken
}

function resolveBorrowTokenId(detail: AssetDetail) {
  const match = HOME_BORROW_TOKENS.find((token) => token.symbol.toLowerCase() === detail.hero.symbol.toLowerCase())
  return match?.id ?? "usdc"
}

function resolveBorrowContext(detail: AssetDetail) {
  const symbol = detail.hero.symbol.toUpperCase()
  const stablePool = HOME_COLLATERAL_POOLS.find((pool) => pool.id === "usdc-usdt")
  const bluechipPool = HOME_COLLATERAL_POOLS.find((pool) => pool.id === "eth-usdc")
  const btcPool = HOME_COLLATERAL_POOLS.find((pool) => pool.id === "wbtc-eth")

  if (symbol === "USDC" || symbol === "USDT" || symbol === "DAI") return stablePool ?? HOME_COLLATERAL_POOLS[0]
  if (symbol === "WBTC") return btcPool ?? HOME_COLLATERAL_POOLS[0]
  if (symbol === "ETH" || symbol === "WETH") return bluechipPool ?? HOME_COLLATERAL_POOLS[0]

  return bluechipPool ?? HOME_COLLATERAL_POOLS[0]
}

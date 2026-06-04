"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { AssetDetail } from "@/app/lib/borrow-detail"
import { AboutNewsSection, HeroSideCard } from "@/app/borrow/_detail/ui"
import { BorrowModal } from "@/app/borrow/components/borrow-modal"
import { LendModals } from "@/app/lend/components/lend-modals"
import { MARKETS, TOKENS } from "@/app/lend/components/data"
import { TokenIcon } from "@/app/components/token-icon"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import { HOME_BORROW_TOKENS, HOME_COLLATERAL_POOLS } from "@/app/lib/home-sim"

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
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <TokenRail detail={detail} />
      <AboutNewsSection
        className="pt-0"
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
        <HeroSideCard
          tabs={[
            { id: "deposit", label: "Deposit" },
            { id: "withdraw", label: "Withdraw" },
            { id: "borrow", label: "Borrow" },
          ]}
          value={tab}
          onValueChange={(value) => {
            setTab(value as SidebarTab)
            setAmount("")
          }}
          className="rounded-[20px] border border-border/60 bg-surface-raised p-5 shadow-elev-1 [&>div]:p-0"
        >
          <div className="space-y-4 pt-1">
            <div className="px-1 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[hsl(var(--brand))]">
                  {tab === "deposit" ? "You're depositing" : tab === "withdraw" ? "You're withdrawing" : "You're borrowing"}
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
                  className="text-[12px] font-medium text-[hsl(var(--brand))] transition-colors hover:opacity-80"
                >
                  Max
                </button>
              </div>

              <div className="flex min-h-[128px] flex-col items-center justify-center gap-3 py-2 text-center">
                <label className="flex w-full justify-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                    className="no-number-spinner w-[min(100%,12ch)] bg-transparent text-center font-compact text-[clamp(3.2rem,9vw,4.8rem)] font-medium leading-none tracking-[-0.05em] text-foreground outline-none placeholder:text-muted-foreground/20"
                  />
                </label>
                <div className="text-[12px] text-muted-foreground">
                  {amount
                    ? `≈ $${(parsedAmount * tokenPrice).toFixed(2)}`
                    : tab === "deposit"
                      ? "Start earning from LP Hub deposits"
                      : tab === "withdraw"
                        ? "Choose how much to withdraw"
                        : "Borrow against supported LP collateral"}
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <MetricTile
                title={tab === "borrow" ? "Borrow asset" : tab === "deposit" ? "Deposit asset" : "Withdraw asset"}
                value={detail.hero.symbol}
                icon={<TokenIcon symbol={detail.hero.symbol} size="lg" />}
              />

              <MetricTile
                title={tab === "borrow" ? "Borrow APY" : tab === "deposit" ? "Supply APY" : "Available balance"}
                value={tab === "borrow" ? borrowAprLabel : tab === "deposit" ? `${token.apy.toFixed(2)}%` : `${tokenBalance.toLocaleString()}`}
                icon={
                  <span className="font-compact text-[28px] leading-none text-[hsl(var(--brand))]">
                    {tab === "withdraw" ? "$" : "%"}
                  </span>
                }
              />
            </div>

            <button
              type="button"
              disabled={isInvalidAmount || exceedsBalance}
              onClick={() => {
                if (tab === "borrow") {
                  setBorrowOpen(true)
                  return
                }
                openLend(tab)
              }}
              className={cn(
                "h-10 w-full rounded-radius-sm text-[13px] font-medium transition-colors",
                isInvalidAmount || exceedsBalance
                  ? "cursor-not-allowed bg-surface-inset text-muted-foreground"
                  : "bg-accent-primary text-accent-primary-foreground shadow-elev-1 hover:bg-accent-primary-hover",
              )}
            >
              {isInvalidAmount
                ? "Enter an amount"
                : exceedsBalance
                  ? "Exceeds balance"
                  : tab === "deposit"
                    ? "Review deposit"
                    : tab === "withdraw"
                      ? "Review withdrawal"
                      : "Review borrow"}
            </button>

            <div className="text-center text-[12px] text-muted-foreground">
              Powered by Aave v4.{" "}
              <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
                Learn More
              </a>
            </div>
          </div>
        </HeroSideCard>
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

function MetricTile({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="grid h-[70px] grid-cols-[4rem_minmax(0,1fr)] items-center gap-2.5 rounded-radius-md border border-border bg-surface-raised px-4 text-left md:h-[58px] md:grid-cols-[2.75rem_minmax(0,1fr)] md:gap-2.5 md:px-3.5">
      <span className="flex h-10 w-[3.2rem] items-center justify-center md:h-9 md:w-[2.75rem]">{icon}</span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[12px] font-medium tracking-[0.02em] text-[hsl(var(--brand))] md:text-[11.5px]">{title}</span>
        <span className="truncate pt-1 text-[16px] font-medium text-foreground md:pt-0.5 md:text-[15px]">{value}</span>
      </span>
    </div>
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

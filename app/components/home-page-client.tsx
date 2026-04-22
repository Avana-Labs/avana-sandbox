"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Search, Settings, TrendingUp } from "lucide-react"
import {
  HOME_BORROW_TOKENS,
  HOME_CLAIM_POSITIONS,
  HOME_COLLATERAL_POOLS,
  HOME_DEFAULT_SELECTIONS,
  HOME_INITIAL_CLAIMABLE_TOTALS,
  HOME_INITIAL_CLAIM_SELECTIONS,
  HOME_INITIAL_DEBTS,
  calculateBorrowPreview,
  calculateClaimPreview,
  calculateRemovePreview,
  calculateRepayPreview,
  formatCompactUsd,
  formatHealthFactor,
  formatUsd,
  getBorrowTokenById,
  getClaimBreakdownLabel,
  getHealthStatus,
  getPoolById,
  healthGaugePercent,
  type HomeBorrowToken,
  type HomeCollateralPool,
  type HomeMode,
  type HomeSuccessRow,
} from "@/app/lib/home-sim"
import type { HomeChain, HomeHowItWorksStep } from "@/app/lib/home-data"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type HomePageClientProps = {
  chains: HomeChain[]
  howItWorksSteps: HomeHowItWorksStep[]
  totalPools: number
  completedPools: number
  progressPercentage: number
  totalPoints: number
}

type HomeSuccessState = {
  emoji: string
  title: string
  amount: string
  description: string
  rows: HomeSuccessRow[]
}

type PoolDialogMode = "borrow" | "repay" | "remove"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

const REPAY_APR_BY_POOL_ID: Record<string, number> = {
  "eth-usdc": 5.2,
  "usdc-usdt": 3.9,
  "wbtc-eth": 0,
}

function PickerSurface({
  label,
  children,
  footer,
  tier = "top",
}: {
  label: string
  children: React.ReactNode
  footer?: React.ReactNode
  tier?: "top" | "bottom"
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-[18px] transition-colors",
        tier === "top" ? "border-border/70 bg-card" : "border-border/60 bg-muted/40",
      )}
    >
      <div className="mb-1 text-[13px] font-medium text-muted-foreground">{label}</div>
      {children}
      {footer ? <div className="mt-3 text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  )
}

function PrimaryCardButton({
  disabled,
  children,
  onClick,
}: {
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-1 h-[52px] w-full rounded-[20px] text-[19px] font-semibold shadow-none transition-colors",
        disabled ? "bg-brand-soft text-brand-soft-foreground opacity-100 hover:bg-brand-soft" : "bg-brand text-white hover:bg-brand/90",
      )}
    >
      {children}
    </Button>
  )
}

function computeHealthFactor(pool: HomeCollateralPool, debtUsd: number): number {
  if (debtUsd <= 0) return Number.POSITIVE_INFINITY
  return (pool.collateralUsd * (pool.maxLtv / 100)) / debtUsd
}

function PoolPickerDialog({
  open,
  onOpenChange,
  selectedPoolId,
  onSelect,
  mode,
  debts,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedPoolId: string
  onSelect: (poolId: string) => void
  mode: PoolDialogMode
  debts: Record<string, number>
}) {
  const [focusedPoolId, setFocusedPoolId] = useState(selectedPoolId)

  useEffect(() => {
    if (open) setFocusedPoolId(selectedPoolId)
  }, [open, selectedPoolId])

  const title = mode === "borrow" ? "Select LP pool" : mode === "repay" ? "Select debt position" : "Select collateral position"

  const focusedPool = useMemo(() => getPoolById(focusedPoolId), [focusedPoolId])
  const focusedDebt = debts[focusedPoolId] ?? 0
  const focusedHf = computeHealthFactor(focusedPool, focusedDebt)
  const focusedStatus = getHealthStatus(focusedHf)
  const gaugePercent = healthGaugePercent(focusedHf)
  const ltvUsedPercent = focusedPool.borrowPowerUsd > 0
    ? Math.min(100, (focusedDebt / focusedPool.borrowPowerUsd) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[640px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:max-w-[440px]">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-[17px] font-semibold">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1.5 px-5 pb-1 text-[13px] text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Positions</span>
        </div>

        <div className="max-h-[240px] overflow-y-auto">
          {HOME_COLLATERAL_POOLS.map((pool) => {
            const isFocused = pool.id === focusedPoolId
            const debtUsd = debts[pool.id] ?? 0
            const hf = computeHealthFactor(pool, debtUsd)
            const status = getHealthStatus(hf)

            return (
              <button
                key={pool.id}
                type="button"
                onClick={() => setFocusedPoolId(pool.id)}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-3 text-left transition-colors",
                  isFocused ? "bg-surface-1" : "hover:bg-surface-1",
                )}
              >
                <PairVisual visuals={pool.visuals} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold text-foreground">{pool.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {pool.venue} · Max LTV {pool.maxLtv}%
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-data text-[15px] font-semibold">
                    {mode === "repay" ? (debtUsd > 0 ? formatCompactUsd(debtUsd) : "No debt") : formatCompactUsd(pool.collateralUsd)}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", status.textClass)}>
                    <span className={cn("inline-block size-1.5 rounded-full", status.dotClass)} />
                    HF {Number.isFinite(hf) ? hf.toFixed(2) : "∞"}
                  </span>
                </div>
                {isFocused ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>

        <div className="mt-2 h-px bg-border" />

        <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
          <div className="rounded-[20px] border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-data text-[44px] font-bold leading-none tracking-tight text-foreground">
                  {Number.isFinite(focusedHf) ? focusedHf.toFixed(2) : "∞"}
                </div>
                <div className="mt-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Health factor
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-bold tracking-wide", focusedStatus.textClass)}>
                  <span className={cn("inline-block size-2 rounded-full", focusedStatus.dotClass)} />
                  {focusedStatus.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{focusedPool.name}</span>
              </div>
            </div>

            <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full", focusedStatus.barClass)}
                style={{ width: `${gaugePercent}%` }}
              />
              <div
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-[0_0_0_2px_rgba(0,0,0,0.08)]"
                style={{ left: `${gaugePercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-data text-[16px] font-bold tracking-tight text-foreground">
                  {ltvUsedPercent.toFixed(0)}%
                </span>
                <span className="text-[12px] text-muted-foreground">borrow power used</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCompactUsd(focusedDebt)}</span>
                <span className="mx-1">/</span>
                <span>{formatCompactUsd(focusedPool.borrowPowerUsd)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <Button
            type="button"
            onClick={() => onSelect(focusedPoolId)}
            className="h-[52px] w-full rounded-[20px] bg-brand text-[17px] font-semibold text-white shadow-none transition-colors hover:bg-brand/90"
          >
            Use {focusedPool.name}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const TOKEN_ADDRESS_BY_SYMBOL: Record<string, string> = {
  ETH: "Native",
  USDC: "0xA0b8...eB48",
  USDT: "0xdAC1...1ec7",
  WBTC: "0x2260...C599",
  WETH: "0xC02a...6Cc2",
  DAI: "0x6B17...1d0F",
  GHO: "0x40D1...4f7c",
  LINK: "0x5149...df96",
  UNI: "0x1f98...f984",
  AAVE: "0x7Fc6...4B9e",
  ARB: "0xB50C...8548",
  OP: "0x4200...0042",
  LDO: "0x5a98...7a32",
  MKR: "0x9f8F...5d2",
}

function ShortcutTokenButton({
  visual,
  symbol,
  selected,
  onClick,
}: {
  visual: HomeBorrowToken["visual"]
  symbol: string
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <TokenBubble visual={visual} className="size-9" />
      <span className="text-[13px] font-medium text-foreground">{symbol}</span>
    </button>
  )
}

function TokenPickerDialog({
  open,
  onOpenChange,
  selectedTokenId,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTokenId: string | null
  onSelect: (tokenId: string) => void
}) {
  const [query, setQuery] = useState("")

  const filteredTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return HOME_BORROW_TOKENS
    }

    return HOME_BORROW_TOKENS.filter(
      (token) => token.symbol.toLowerCase().includes(normalizedQuery) || token.name.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextValue) => {
        onOpenChange(nextValue)
        if (!nextValue) {
          setQuery("")
        }
      }}
    >
      <DialogContent className="flex h-[640px] flex-col overflow-hidden rounded-[24px] border border-border bg-card p-0 shadow-[0_10px_40px_rgba(0,0,0,0.08)] sm:max-w-[420px]">
        <DialogHeader className="flex-row items-center justify-between px-5 pb-3 pt-5 text-left space-y-0">
          <DialogTitle className="text-[17px] font-semibold">Select a token</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden pb-3">
          <div className="px-4">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-1 px-4 py-3 transition-colors focus-within:bg-surface-2">
              <Search className="h-[18px] w-[18px] text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tokens"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
              />
              <button type="button" className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-sm transition-colors hover:bg-muted" aria-label="Filter networks">
                <span className="relative inline-flex">
                  <span className="inline-block size-4 rounded-full bg-brand" />
                  <span className="absolute -right-1 inline-block size-4 rounded-full bg-indigo-500 ring-2 ring-background" />
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-5 gap-1 px-3 pt-2">
            {HOME_BORROW_TOKENS.slice(0, 5).map((token) => (
              <ShortcutTokenButton
                key={`shortcut-${token.id}`}
                visual={token.visual}
                symbol={token.symbol}
                selected={token.id === selectedTokenId}
                onClick={() => onSelect(token.id)}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5 px-5 pb-1 pt-2 text-[13px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Tokens by 24H volume</span>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto">
            {filteredTokens.map((token) => {
              const isSelected = token.id === selectedTokenId
              const address = TOKEN_ADDRESS_BY_SYMBOL[token.symbol] ?? ""

              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => onSelect(token.id)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                    isSelected ? "bg-surface-1" : "hover:bg-surface-1",
                  )}
                >
                  <TokenBubble visual={token.visual} className="size-9" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-semibold text-foreground">{token.name}</span>
                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <span>{token.symbol}</span>
                      {address ? <span className="truncate">{address}</span> : null}
                    </div>
                  </div>
                  {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              )
            })}

            {filteredTokens.length === 0 ? (
              <div className="mx-4 rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No tokens match that search.
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CompactBorrowCard({
  pool,
  token,
  amount,
  preview,
  onAmountChange,
  onOpenPoolDialog,
  onOpenTokenDialog,
  onQuickTokenSelect,
  onSetMax,
  onSubmit,
}: {
  pool: HomeCollateralPool
  token: HomeBorrowToken | null
  amount: string
  preview: ReturnType<typeof calculateBorrowPreview>
  onAmountChange: (value: string) => void
  onOpenPoolDialog: () => void
  onOpenTokenDialog: () => void
  onQuickTokenSelect: (tokenId: string) => void
  onSetMax: () => void
  onSubmit: () => void
}) {
  const hasAmount = Number.parseFloat(amount) > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1">
        <PickerSurface label="Collateral" tier="top">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-[28px] font-semibold tracking-tight text-foreground">{formatCompactUsd(pool.collateralUsd)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{pool.name}</div>
            </div>
            <button
              type="button"
              onClick={onOpenPoolDialog}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-foreground transition-colors hover:bg-muted/80"
            >
              <PairVisual visuals={pool.visuals} className="w-10" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </PickerSurface>

        <PickerSurface
          label="Borrow"
          tier="bottom"
          footer={
            <div className="flex items-center justify-between gap-3">
              <span>{formatCompactUsd(pool.borrowPowerUsd)} Available to borrow</span>
              <button type="button" onClick={onSetMax} className="font-semibold text-brand transition-opacity hover:opacity-80">
                Max
              </button>
            </div>
          }
        >
          <div className="flex items-center justify-between gap-4">
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">Borrow amount</span>
              <input
                aria-label="Borrow amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-xs text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            {token ? (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                <TokenBubble visual={token.visual} className="size-5" />
                {token.symbol}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenTokenDialog}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-brand px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
              >
                Select token
                <ChevronDown className="h-3.5 w-3.5 text-white/85" />
              </button>
            )}
          </div>
        </PickerSurface>
      </div>

      {preview.warningTitle && preview.warningMessage ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            preview.riskTone === "danger"
              ? "border-rose-200 bg-rose-500/10 text-rose-700"
              : "border-amber-200 bg-amber-500/10 text-amber-700",
          )}
        >
          <strong className="font-semibold">{preview.warningTitle}.</strong> {preview.warningMessage}
        </div>
      ) : null}

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF</div>
            <div className="mt-1 font-data text-sm font-semibold">{preview.healthFactorLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Remaining</div>
            <div className="mt-1 font-data text-sm font-semibold text-emerald-600">{formatCompactUsd(preview.remainingBorrowPowerUsd)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Liq. at</div>
            <div className="mt-1 font-data text-sm font-semibold text-amber-600">{formatCompactUsd(pool.liquidationUsd)}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CompactRepayCard({
  pool,
  debtUsd,
  amount,
  preview,
  onOpenPoolDialog,
  onAmountChange,
  onSetMax,
  onSubmit,
}: {
  pool: HomeCollateralPool
  debtUsd: number
  amount: string
  preview: ReturnType<typeof calculateRepayPreview>
  onOpenPoolDialog: () => void
  onAmountChange: (value: string) => void
  onSetMax: () => void
  onSubmit: () => void
}) {
  const hasAmount = Number.parseFloat(amount) > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1">
        <PickerSurface label="Loan position" tier="top">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-2xl font-semibold tracking-tight text-foreground">{formatCompactUsd(debtUsd)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{pool.name}</div>
            </div>
            <button
              type="button"
              onClick={onOpenPoolDialog}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-foreground transition-colors hover:bg-muted/80"
            >
              <PairVisual visuals={pool.visuals} className="w-10" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </PickerSurface>

        <PickerSurface
          label="Repay"
          tier="bottom"
          footer={
            <div className="flex items-center justify-between gap-3">
              <span>{preview.amountUsd > 0 ? `Interest saved ~${formatCompactUsd(preview.yearlyInterestSavedUsd)} / yr` : "Repay in USDC."}</span>
              <button type="button" onClick={onSetMax} className="font-semibold text-brand transition-opacity hover:opacity-80">
                Max
              </button>
            </div>
          }
        >
          <div className="flex items-center justify-between gap-4">
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">Repay amount</span>
              <input
                aria-label="Repay amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-xs text-muted-foreground">{amount ? `$${amount}` : "$0"}</span>
            </label>
            <div className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[15px] font-semibold text-foreground">
              <TokenBubble visual={HOME_BORROW_TOKENS[0].visual} className="size-5" />
              USDC
            </div>
          </div>
        </PickerSurface>
      </div>

      <PrimaryCardButton disabled={!preview.isValid || preview.isEmpty} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Remaining</div>
            <div className="mt-1 font-data text-sm font-semibold">{preview.remainingDebtLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF after</div>
            <div className="mt-1 font-data text-sm font-semibold text-emerald-600">{preview.healthFactorAfterLabel}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Fee</div>
            <div className="mt-1 font-data text-sm font-semibold">~$0.80</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CompactClaimCard({
  amount,
  preview,
  claimableTotals,
  selections,
  onToggleSelection,
  onAmountChange,
  onSetAll,
  onSubmit,
}: {
  amount: string
  preview: ReturnType<typeof calculateClaimPreview>
  claimableTotals: Record<string, number>
  selections: Record<string, boolean>
  onToggleSelection: (positionId: string) => void
  onAmountChange: (value: string) => void
  onSetAll: () => void
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[20px] border border-border/70 bg-card px-5 py-5 text-foreground">
        <div className="text-[13px] font-medium text-muted-foreground">Total claimable</div>
        <div className="mt-1 font-data text-[28px] font-semibold tracking-tight">{formatUsd(preview.selectedTotalUsd)}</div>
      </div>

      <div className="flex flex-col gap-2">
        {HOME_CLAIM_POSITIONS.map((position) => {
          const isSelected = selections[position.id]

          return (
            <button
              key={position.id}
              type="button"
              onClick={() => onToggleSelection(position.id)}
              className={cn(
                "flex items-center gap-4 rounded-[20px] border px-4 py-3 text-left transition-colors",
                isSelected
                  ? "border-brand bg-brand-soft"
                  : "border-border/60 bg-muted/40 hover:bg-muted/60",
              )}
            >
              <PairVisual visuals={[position.breakdown[0].visual, position.breakdown[1]?.visual ?? position.breakdown[0].visual]} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold text-foreground">{position.name}</span>
                <span className="text-xs text-muted-foreground">{position.subtitle}</span>
              </div>
              <div className="font-data text-sm font-semibold text-emerald-600">{formatUsd(claimableTotals[position.id] ?? 0)}</div>
            </button>
          )
        })}
      </div>

      <PickerSurface
        label="Claim amount"
        tier="bottom"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span>{preview.helperLabel}</span>
            <button type="button" onClick={onSetAll} className="font-semibold text-brand transition-opacity hover:opacity-80">
              All
            </button>
          </div>
        }
      >
        <div className="flex items-center justify-between gap-4">
          <label className="flex min-w-0 flex-1 flex-col">
            <span className="sr-only">Claim amount</span>
            <input
              aria-label="Claim amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
                className="no-number-spinner w-full bg-transparent font-data text-[40px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </label>
          <div className="inline-flex h-8 items-center justify-center rounded-full bg-muted px-3 py-1 text-[15px] font-semibold text-foreground">
            USD
          </div>
        </div>
      </PickerSurface>

      <PrimaryCardButton disabled={!preview.hasSelection} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

function CompactRemoveCard({
  pool,
  percent,
  preview,
  onOpenPoolDialog,
  onPercentChange,
  onSubmit,
}: {
  pool: HomeCollateralPool
  percent: number
  preview: ReturnType<typeof calculateRemovePreview>
  onOpenPoolDialog: () => void
  onPercentChange: (value: number) => void
  onSubmit: () => void
}) {
  const hasAmount = percent > 0

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-1">
        <PickerSurface label="Remove from" tier="top">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-data text-2xl font-semibold tracking-tight text-foreground">{pool.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">Max safe remove {preview.safePercent}%</div>
            </div>
            <button
              type="button"
              onClick={onOpenPoolDialog}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-foreground transition-colors hover:bg-muted/80"
            >
              <PairVisual visuals={pool.visuals} className="w-10" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </PickerSurface>

        <PickerSurface label="Remove amount" tier="bottom" footer={`Health factor after ${preview.healthFactorAfterLabel}`}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Percentage</span>
              <span className="font-data text-3xl font-semibold tracking-tight">{percent}%</span>
            </div>
            <Slider
              value={[percent]}
              onValueChange={(value) => onPercentChange(value[0] ?? 0)}
              max={100}
              step={1}
              aria-label="Remove collateral percentage"
            />
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onPercentChange(preset)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm font-semibold transition-colors",
                    percent === preset ? "border-border/60 bg-card text-foreground" : "border-transparent bg-transparent text-muted-foreground hover:bg-card/60",
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </PickerSurface>
      </div>

      {hasAmount ? (
        <div className="mt-1 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">Receive</div>
            <div className="mt-1 font-data text-sm font-semibold text-emerald-600">{formatCompactUsd(preview.removeUsd)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">After</div>
            <div className="mt-1 font-data text-sm font-semibold">{formatCompactUsd(preview.afterCollateralUsd)}</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
            <div className="text-[11px] text-muted-foreground">HF</div>
            <div className={cn("mt-1 font-data text-sm font-semibold", preview.isUnsafe ? "text-rose-600" : "text-amber-600")}>
              {preview.healthFactorAfterLabel}
            </div>
          </div>
        </div>
      ) : null}

      {preview.isUnsafe ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
          <strong className="font-semibold">Liquidation risk.</strong> Repay debt first before removing this much.
        </div>
      ) : null}

      <PrimaryCardButton disabled={preview.isUnsafe} onClick={onSubmit}>
        {preview.ctaLabel}
      </PrimaryCardButton>
    </div>
  )
}

function ActionSuccessDialog({
  state,
  onClose,
}: {
  state: HomeSuccessState | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!state) {
      return
    }

    import("canvas-confetti")
      .then((confetti) => {
        confetti.default({
          particleCount: 110,
          spread: 70,
          origin: { y: 0.65 },
          colors: ["#FC2672", "#18C964", "#F5A623", "#006FEE", "#7928CA", "#F31260"],
        })
      })
      .catch(() => undefined)
  }, [state])

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-[24px] border border-border/40 bg-card p-0 shadow-xl sm:max-w-[440px]">
        {state ? (
          <>
            <DialogHeader className="items-center gap-3 px-6 pb-2 pt-8 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-5xl">{state.emoji}</div>
              <DialogTitle className="mt-2 text-2xl font-semibold tracking-tight">{state.title}</DialogTitle>
              <div className="font-data text-xl font-semibold text-brand">{state.amount}</div>
              <DialogDescription className="max-w-sm text-center text-sm text-muted-foreground">{state.description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 p-6">
              <div className="rounded-2xl border border-border/40 bg-surface-1">
                <div className="flex flex-col">
                  {state.rows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span
                        className={cn(
                          "font-data text-sm font-semibold",
                          row.tone === "positive" && "text-emerald-600",
                          row.tone === "warning" && "text-amber-600",
                          row.tone === "danger" && "text-rose-600",
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 pb-6 pt-2 sm:justify-center">
              <Button type="button" className="h-12 w-full rounded-[20px] bg-brand-soft text-[17px] font-semibold text-brand shadow-none transition-colors hover:bg-brand-soft" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function HomePageClient(_props: HomePageClientProps) {
  const [mode, setMode] = useState<HomeMode>("borrow")
  const [borrowPoolId, setBorrowPoolId] = useState(HOME_DEFAULT_SELECTIONS.borrowPoolId)
  const [borrowTokenId, setBorrowTokenId] = useState<string | null>(null)
  const [borrowAmount, setBorrowAmount] = useState("")
  const [repayPoolId, setRepayPoolId] = useState(HOME_DEFAULT_SELECTIONS.repayPoolId)
  const [repayAmount, setRepayAmount] = useState("")
  const [claimSelections, setClaimSelections] = useState(() => ({ ...HOME_INITIAL_CLAIM_SELECTIONS }))
  const [claimableTotals, setClaimableTotals] = useState(() => ({ ...HOME_INITIAL_CLAIMABLE_TOTALS }))
  const [claimAmount, setClaimAmount] = useState("")
  const [removePoolId, setRemovePoolId] = useState(HOME_DEFAULT_SELECTIONS.removePoolId)
  const [removePercent, setRemovePercent] = useState(HOME_DEFAULT_SELECTIONS.removePercent)
  const [debts, setDebts] = useState(() => ({ ...HOME_INITIAL_DEBTS }))
  const [poolDialogMode, setPoolDialogMode] = useState<PoolDialogMode | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [successState, setSuccessState] = useState<HomeSuccessState | null>(null)

  const borrowPool = useMemo(() => getPoolById(borrowPoolId), [borrowPoolId])
  const borrowToken = useMemo(() => borrowTokenId ? getBorrowTokenById(borrowTokenId) : null, [borrowTokenId])
  const borrowPreview = useMemo(
    () => {
      const p = calculateBorrowPreview(borrowPool, Number.parseFloat(borrowAmount) || 0, borrowToken?.symbol ?? "Tokens")
      if (!borrowToken) {
        p.isValid = false
        p.ctaLabel = "Select token"
      }
      return p
    },
    [borrowAmount, borrowPool, borrowToken],
  )

  const repayPool = useMemo(() => getPoolById(repayPoolId), [repayPoolId])
  const repayPreview = useMemo(
    () =>
      calculateRepayPreview(
        repayPool,
        debts[repayPoolId] ?? 0,
        Number.parseFloat(repayAmount) || 0,
        REPAY_APR_BY_POOL_ID[repayPoolId] ?? 0,
      ),
    [debts, repayAmount, repayPool, repayPoolId],
  )

  const claimPreview = useMemo(
    () => calculateClaimPreview(HOME_CLAIM_POSITIONS, claimableTotals, claimSelections, Number.parseFloat(claimAmount) || null),
    [claimAmount, claimSelections, claimableTotals],
  )

  const removePool = useMemo(() => getPoolById(removePoolId), [removePoolId])
  const removePreview = useMemo(
    () => calculateRemovePreview(removePool, debts[removePoolId] ?? 0, removePercent),
    [debts, removePercent, removePool, removePoolId],
  )

  const handleBorrowConfirm = () => {
    if (!borrowPreview.isValid || borrowPreview.isEmpty || !borrowToken) {
      return
    }

    const amountUsd = Number.parseFloat(borrowAmount) || 0
    const nextDebt = (debts[borrowPoolId] ?? 0) + amountUsd
    const nextHealthFactor = (borrowPool.collateralUsd * (borrowPool.maxLtv / 100)) / nextDebt

    setDebts((currentValue) => ({
      ...currentValue,
      [borrowPoolId]: nextDebt,
    }))
    setBorrowAmount("")
    setSuccessState({
      emoji: "💸",
      title: "Borrowed",
      amount: `${amountUsd.toFixed(0)} ${borrowToken.symbol}`,
      description: `Your ${borrowPool.name} position keeps earning ${borrowPool.pairApr.toFixed(1)}% LP APR while the loan stays active.`,
      rows: [
        { label: "Health factor", value: formatHealthFactor(nextHealthFactor), tone: "positive" },
        { label: "LP still earning", value: `${borrowPool.pairApr.toFixed(1)}% APR`, tone: "positive" },
        { label: "Liquidation threshold", value: formatCompactUsd(borrowPool.liquidationUsd), tone: "warning" },
      ],
    })
    toast.success(`Borrowed ${amountUsd.toFixed(0)} ${borrowToken.symbol}`)
  }

  const handlePoolSelect = (poolId: string) => {
    if (poolDialogMode === "borrow") {
      setBorrowPoolId(poolId)
    }

    if (poolDialogMode === "repay") {
      if ((debts[poolId] ?? 0) <= 0) {
        toast.warning(`No debt on ${getPoolById(poolId).name}`)
        return
      }

      setRepayPoolId(poolId)
      setRepayAmount("")
    }

    if (poolDialogMode === "remove") {
      setRemovePoolId(poolId)
    }

    setPoolDialogMode(null)
  }

  const handleRepayConfirm = () => {
    if (!repayPreview.isValid || repayPreview.isEmpty) {
      return
    }

    const amountUsd = Number.parseFloat(repayAmount) || 0
    const remainingDebtUsd = Math.max(0, (debts[repayPoolId] ?? 0) - amountUsd)

    setDebts((currentValue) => ({
      ...currentValue,
      [repayPoolId]: remainingDebtUsd,
    }))
    setRepayAmount("")
    setSuccessState({
      emoji: "💚",
      title: "Repaid",
      amount: `${formatCompactUsd(amountUsd)} USDC`,
      description: "Debt paid down. Your collateral is safer now.",
      rows: [
        { label: "Remaining debt", value: `${formatCompactUsd(remainingDebtUsd)} USDC`, tone: remainingDebtUsd === 0 ? "positive" : "warning" },
        { label: "New health factor", value: repayPreview.healthFactorAfterLabel, tone: "positive" },
        { label: "Interest saved / yr", value: formatCompactUsd(repayPreview.yearlyInterestSavedUsd), tone: "positive" },
      ],
    })
    toast.success(`Repaid ${formatCompactUsd(amountUsd)} USDC`)
  }

  const handleClaimConfirm = () => {
    if (!claimPreview.hasSelection || claimPreview.effectiveClaimUsd <= 0) {
      toast.warning("Select positions to claim")
      return
    }

    setClaimableTotals((currentValue) => {
      const nextValue = { ...currentValue }

      claimPreview.selectedPositionIds.forEach((positionId) => {
        nextValue[positionId] = 0
      })

      return nextValue
    })
    setClaimAmount("")
    setSuccessState({
      emoji: "🌿",
      title: "Fees claimed",
      amount: formatUsd(claimPreview.effectiveClaimUsd),
      description: "LP fees were routed to your wallet. The underlying positions continue earning.",
      rows: Object.entries(claimPreview.tokenTotals)
        .filter(([, value]) => value > 0)
        .slice(0, 3)
        .map(([symbol, value]) => ({
          label: `${symbol} received`,
          value: getClaimBreakdownLabel(symbol, value),
          tone: "positive" as const,
        })),
    })
    toast.success(`Claimed ${formatUsd(claimPreview.effectiveClaimUsd)} in fees`)
  }

  const handleRemoveConfirm = () => {
    if (removePreview.isUnsafe) {
      toast.error("Repay debt first before removing that much collateral")
      return
    }

    setSuccessState({
      emoji: "🔓",
      title: "Liquidity removed",
      amount: formatCompactUsd(removePreview.removeUsd),
      description: "The selected LP collateral has been returned to the wallet surface.",
      rows: [
        { label: "Received", value: formatCompactUsd(removePreview.removeUsd), tone: "positive" },
        { label: "Remaining collateral", value: formatCompactUsd(removePreview.afterCollateralUsd) },
        { label: "Network fee", value: "~$1.20" },
      ],
    })
    toast.success(`Removed ${removePercent}% from ${removePool.name}`)
  }

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex min-h-[calc(100vh-64px)] items-start justify-center pt-[5vh] md:pt-[6vh]">
          <div className="w-full max-w-[420px] rounded-[24px] p-2 md:max-w-[480px]">
            <Tabs value={mode} onValueChange={(value) => setMode(value as HomeMode)} className="w-full">
              <div className="mb-3 flex items-center justify-between px-1 pt-1">
                <TabsList className="w-fit gap-0.5">
                  {HOME_MODE_ITEMS.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className="h-8 px-3 text-[15px] font-medium">
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button type="button" className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Settings">
                  <Settings className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="relative mt-2">
                <TabsContent value="borrow" className="mt-0">
                  <CompactBorrowCard
                    pool={borrowPool}
                    token={borrowToken}
                    amount={borrowAmount}
                    preview={borrowPreview}
                    onAmountChange={setBorrowAmount}
                    onOpenPoolDialog={() => setPoolDialogMode("borrow")}
                    onOpenTokenDialog={() => setTokenDialogOpen(true)}
                    onQuickTokenSelect={setBorrowTokenId}
                    onSetMax={() => setBorrowAmount(String(borrowPool.borrowPowerUsd))}
                    onSubmit={handleBorrowConfirm}
                  />
                </TabsContent>

                <TabsContent value="repay" className="mt-0">
                  <CompactRepayCard
                    pool={repayPool}
                    debtUsd={debts[repayPoolId] ?? 0}
                    amount={repayAmount}
                    preview={repayPreview}
                    onOpenPoolDialog={() => setPoolDialogMode("repay")}
                    onAmountChange={setRepayAmount}
                    onSetMax={() => setRepayAmount(String(debts[repayPoolId] ?? 0))}
                    onSubmit={handleRepayConfirm}
                  />
                </TabsContent>

                <TabsContent value="claim" className="mt-0">
                  <CompactClaimCard
                    amount={claimAmount}
                    preview={claimPreview}
                    claimableTotals={claimableTotals}
                    selections={claimSelections}
                    onToggleSelection={(positionId) =>
                      setClaimSelections((currentValue) => ({
                        ...currentValue,
                        [positionId]: !currentValue[positionId],
                      }))
                    }
                    onAmountChange={setClaimAmount}
                    onSetAll={() => setClaimAmount(claimPreview.selectedTotalUsd.toFixed(2))}
                    onSubmit={handleClaimConfirm}
                  />
                </TabsContent>

                <TabsContent value="remove" className="mt-0">
                  <CompactRemoveCard
                    pool={removePool}
                    percent={removePercent}
                    preview={removePreview}
                    onOpenPoolDialog={() => setPoolDialogMode("remove")}
                    onPercentChange={setRemovePercent}
                    onSubmit={handleRemoveConfirm}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>
      </main>

      <PoolPickerDialog
        open={poolDialogMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPoolDialogMode(null)
          }
        }}
        selectedPoolId={poolDialogMode === "repay" ? repayPoolId : poolDialogMode === "remove" ? removePoolId : borrowPoolId}
        onSelect={handlePoolSelect}
        mode={poolDialogMode ?? "borrow"}
        debts={debts}
      />
      <TokenPickerDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        selectedTokenId={borrowTokenId}
        onSelect={(tokenId) => {
          setBorrowTokenId(tokenId)
          setTokenDialogOpen(false)
        }}
      />
      <ActionSuccessDialog state={successState} onClose={() => setSuccessState(null)} />
    </div>
  )
}

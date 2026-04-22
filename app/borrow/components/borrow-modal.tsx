"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HOME_BORROW_TOKENS,
  calculateBorrowPreview,
  formatHealthFactor,
  type HomeBorrowToken,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import {
  BORROWABLE_TOKEN_OPTIONS,
  formatUsdExact,
  getSpokeById,
  healthFactorToneClass,
  homePoolSpoke,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HfNumber, PillButton, SpokeDot, TokenBubble, TokenPairCell } from "./atoms"
import { cn } from "@/lib/utils"

const BORROWABLE_IDS = new Set(BORROWABLE_TOKEN_OPTIONS.map((option) => option.id))

export type BorrowModalContext = {
  pool: HomeCollateralPool
  currentDebtUsd: number
  defaultTokenId?: string
}

export type BorrowModalResult = {
  pool: HomeCollateralPool
  token: HomeBorrowToken
  amountUsd: number
  healthFactorBefore: number | null
  healthFactorAfter: number | null
  remainingBorrowPowerUsd: number
}

type BorrowModalProps = {
  open: boolean
  context: BorrowModalContext | null
  onClose: () => void
  onConfirm: (result: BorrowModalResult) => void
}

export function BorrowModal({ open, context, onClose, onConfirm }: BorrowModalProps) {
  const [amountInput, setAmountInput] = useState("")
  const [tokenId, setTokenId] = useState("usdc")

  useEffect(() => {
    if (open && context) {
      setAmountInput("")
      setTokenId(context.defaultTokenId ?? "usdc")
    }
  }, [open, context])

  const token = useMemo(() => HOME_BORROW_TOKENS.find((candidate) => candidate.id === tokenId) ?? HOME_BORROW_TOKENS[1], [tokenId])
  const tokenOptions = useMemo(() => HOME_BORROW_TOKENS.filter((candidate) => BORROWABLE_IDS.has(candidate.id)), [])

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const preview = useMemo(() => {
    if (!context) return null
    return calculateBorrowPreview(context.pool, safeAmountUsd, token.symbol)
  }, [context, safeAmountUsd, token.symbol])

  if (!context || !preview) {
    return null
  }

  const { pool, currentDebtUsd } = context
  const spoke = getSpokeById(homePoolSpoke(pool.category))
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [ReturnType<typeof homeVisualToBorrowVisual>, ReturnType<typeof homeVisualToBorrowVisual>]
  const currentHealthFactor =
    currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : Number.POSITIVE_INFINITY
  const projectedDebtUsd = currentDebtUsd + safeAmountUsd
  const projectedHealthFactor =
    projectedDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / projectedDebtUsd : Number.POSITIVE_INFINITY
  const exceedsPower = safeAmountUsd > Math.max(0, pool.borrowPowerUsd - currentDebtUsd)

  const ctaDisabled = preview.isEmpty || exceedsPower
  const ctaLabel = preview.isEmpty
    ? "Enter an amount"
    : exceedsPower
      ? "Exceeds borrow power"
      : `Borrow ${safeAmountUsd.toFixed(0)} ${token.symbol}`

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <DialogTitle className="text-[15px] font-semibold text-foreground">Borrow against collateral</DialogTitle>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="rounded-2xl bg-muted px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <TokenPairCell visuals={visuals} name={pool.name} subtitle={pool.venue} size="md" />
                <SpokeDot spoke={spoke} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                <MetricCell label="Collateral" value={formatUsdExact(pool.collateralUsd)} />
                <MetricCell label="Borrow power" value={formatUsdExact(pool.borrowPowerUsd)} />
                <MetricCell label="Max LTV" value={`${pool.maxLtv}%`} />
              </dl>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="borrow-amount" className="text-xs font-medium uppercase tracking-[0.07em] text-muted-foreground">
                  You borrow
                </label>
                <button
                  type="button"
                  onClick={() => setAmountInput(Math.max(0, pool.borrowPowerUsd - currentDebtUsd).toFixed(0))}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Max
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="borrow-amount"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(event) => {
                    const next = event.target.value.replace(/[^0-9.]/g, "")
                    setAmountInput(next)
                  }}
                  placeholder="0"
                  className="flex-1 border-none bg-transparent font-data text-[34px] font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      <TokenBubble visual={homeVisualToBorrowVisual(token.visual)} size="sm" />
                      {token.symbol}
                      <ChevronDown className="size-3.5 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    {tokenOptions.map((option) => (
                      <DropdownMenuItem key={option.id} onSelect={() => setTokenId(option.id)}>
                        <TokenBubble visual={homeVisualToBorrowVisual(option.visual)} size="xs" className="mr-2" />
                        <span className="flex-1">{option.symbol}</span>
                        <span className="text-xs text-muted-foreground">{option.borrowApr.toFixed(1)}%</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">~ {formatUsdExact(safeAmountUsd)}</div>
            </div>

            {preview.warningTitle ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <div className="font-semibold">{preview.warningTitle}</div>
                <div className="mt-0.5">{preview.warningMessage}</div>
              </div>
            ) : null}

            <dl className="divide-y divide-border rounded-xl border border-border">
              <StatLine label="Current debt" value={formatUsdExact(currentDebtUsd)} />
              <StatLine label="After borrow" value={formatUsdExact(projectedDebtUsd)} />
              <StatLine
                label="Health factor"
                value={
                  <span className="flex items-center gap-1.5">
                    <HfNumber value={formatHealthFactor(currentHealthFactor)} tone={healthFactorToneClass(currentHealthFactor)} size="sm" />
                    <span className="text-muted-foreground">→</span>
                    <HfNumber value={formatHealthFactor(projectedHealthFactor)} tone={healthFactorToneClass(projectedHealthFactor)} size="sm" />
                  </span>
                }
              />
              <StatLine
                label={`APR (${token.symbol})`}
                value={<span className="font-data font-semibold tabular-nums text-rose-600">{token.borrowApr.toFixed(1)}%</span>}
              />
            </dl>

            <PillButton
              variant="primary"
              size="md"
              className="w-full"
              disabled={ctaDisabled}
              onClick={() => {
                onConfirm({
                  pool,
                  token,
                  amountUsd: safeAmountUsd,
                  healthFactorBefore: Number.isFinite(currentHealthFactor) ? currentHealthFactor : null,
                  healthFactorAfter: Number.isFinite(projectedHealthFactor) ? projectedHealthFactor : null,
                  remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - projectedDebtUsd),
                })
              }}
            >
              {ctaLabel}
            </PillButton>
          </div>

          <DialogClose className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <span className="sr-only">Close</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.07em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-data text-sm font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium text-foreground")}>{value}</span>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, ChevronDown, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import {
  HOME_BORROW_TOKENS,
  HOME_COLLATERAL_POOLS,
  calculateBorrowPreview,
  formatHealthFactor,
  type HomeBorrowToken,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { sanitizeNumericInput } from "@/app/lib/numeric-input"
import {
  BORROWABLE_TOKEN_OPTIONS,
  formatUsdExact,
  healthFactorToneClass,
  homeVisualToBorrowVisual,
} from "@/app/lib/borrow-sim"
import { HfNumber, PillButton, TokenBubble } from "./atoms"

const BORROWABLE_IDS = new Set(BORROWABLE_TOKEN_OPTIONS.map((option) => option.id))

type ModalStage = "entry" | TransactionFlowStage

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
  initialAmount?: string
  initialTokenId?: string | null
  startStage?: "entry" | "review"
  onClose: () => void
  onConfirm: (result: BorrowModalResult) => void
}

export function BorrowModal({
  open,
  context,
  initialAmount,
  initialTokenId,
  startStage = "entry",
  onClose,
  onConfirm,
}: BorrowModalProps) {
  const [amountInput, setAmountInput] = useState("")
  const [tokenId, setTokenId] = useState("usdc")
  const [stage, setStage] = useState<ModalStage>("entry")

  useEffect(() => {
    if (open && context) {
      setAmountInput(initialAmount ?? "")
      setTokenId(initialTokenId ?? context.defaultTokenId ?? "usdc")
      setStage(startStage)
    }
  }, [initialAmount, initialTokenId, open, context, startStage])

  const token = useMemo(
    () => HOME_BORROW_TOKENS.find((candidate) => candidate.id === tokenId) ?? HOME_BORROW_TOKENS[1],
    [tokenId],
  )
  const tokenOptions = useMemo(() => HOME_BORROW_TOKENS.filter((candidate) => BORROWABLE_IDS.has(candidate.id)), [])

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const preview = useMemo(() => {
    if (!context) return null
    return calculateBorrowPreview(context.pool, safeAmountUsd, token.symbol)
  }, [context, safeAmountUsd, token.symbol])

  const pool = context?.pool ?? HOME_COLLATERAL_POOLS[0]
  const currentDebtUsd = context?.currentDebtUsd ?? 0
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [
    ReturnType<typeof homeVisualToBorrowVisual>,
    ReturnType<typeof homeVisualToBorrowVisual>,
  ]
  const currentHealthFactor =
    currentDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / currentDebtUsd : Number.POSITIVE_INFINITY
  const projectedDebtUsd = currentDebtUsd + safeAmountUsd
  const projectedHealthFactor =
    projectedDebtUsd > 0 ? (pool.collateralUsd * (pool.maxLtv / 100)) / projectedDebtUsd : Number.POSITIVE_INFINITY
  const exceedsPower = safeAmountUsd > Math.max(0, pool.borrowPowerUsd - currentDebtUsd)
  const ctaDisabled = !preview || preview.isEmpty || exceedsPower

  useEffect(() => {
    if (stage !== "processing") {
      return
    }

    const timer = window.setTimeout(() => {
      onConfirm({
        pool,
        token,
        amountUsd: safeAmountUsd,
        healthFactorBefore: Number.isFinite(currentHealthFactor) ? currentHealthFactor : null,
        healthFactorAfter: Number.isFinite(projectedHealthFactor) ? projectedHealthFactor : null,
        remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - projectedDebtUsd),
      })
      setStage("success")
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [currentHealthFactor, onConfirm, pool, projectedDebtUsd, projectedHealthFactor, safeAmountUsd, stage, token])

  if (!context || !preview) {
    return null
  }

  const flowRows = [
    { label: "Collateral", value: `${pool.name} · ${formatUsdExact(pool.collateralUsd)}` },
    { label: "Current debt", value: formatUsdExact(currentDebtUsd) },
    { label: "Borrow APR", value: `${token.borrowApr.toFixed(1)}%`, tone: "warning" as const },
    {
      label: "Health factor",
      value: `${formatHealthFactor(currentHealthFactor)} -> ${formatHealthFactor(projectedHealthFactor)}`,
      tone: projectedHealthFactor < 1.5 ? "danger" as const : "positive" as const,
    },
  ]

  const handleClose = () => {
    if (stage === "processing") return
    setStage("entry")
    onClose()
  }

  const renderReview = () => (
    <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-5 sm:pt-5">
        <button
          type="button"
          onClick={() => setStage("entry")}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 sm:px-8 sm:pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TokenBubble visual={visuals[0]} size="xl" className="ring-0" />
              <span className="absolute -bottom-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-background">
                <Lock className="size-2.5 text-foreground" />
              </span>
            </div>
            <ArrowRight className="size-4 text-foreground" aria-hidden />
            <TokenBubble visual={homeVisualToBorrowVisual(token.visual)} size="xl" className="ring-0" />
          </div>

          <h2 className="mt-5 font-sans text-[clamp(2rem,5vw,3rem)] font-medium tracking-tight text-foreground">
            Borrow {formatUsdExact(safeAmountUsd)} in {token.symbol}
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            with {visuals[0].symbol} as collateral
          </p>
        </div>

        <div className="mt-10 space-y-5">
          <ReviewRow label="Receive" value={`${safeAmountUsd.toFixed(0)} ${token.symbol}`} />
          <ReviewRow label="Collateral" value={`${(pool.collateralUsd / Math.max(pool.liquidationUsd, 1)).toFixed(5)} ${visuals[0].symbol}`} />
          <ReviewRow label="Loan-to-Value" value={`${Math.min(100, (projectedDebtUsd / Math.max(pool.collateralUsd, 1)) * 100).toFixed(0)}%`} tone="positive" />
          <ReviewRow label="Liquidation price" value={`${pool.liquidationUsd.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${token.symbol}`} />
          <ReviewRow label="Variable interest rate" value={`${token.borrowApr.toFixed(2)}%`} />
        </div>

      </div>

      <div className="border-t border-border px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-8 sm:pb-5">
          <div className="flex items-end justify-between gap-4">
            <div>
            <div className="text-[13px] font-medium text-foreground">Fees paid</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Estimated transaction cost</div>
            </div>
            <div className="font-data text-[22px] font-medium tracking-tight text-foreground">
            $0
            </div>
          </div>

        <PillButton
          variant="primary"
          size="md"
          className="mt-4 h-12 w-full rounded-full text-[15px]"
          onClick={() => setStage("approve")}
        >
          Continue
        </PillButton>

        <div className="mt-3 text-center text-[12px] text-muted-foreground">
          Powered by Aave v4.{" "}
          <a
            href="https://aave.com/docs/aave-v4"
            target="_blank"
            rel="noreferrer"
            className="text-accent-emphasis"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  )

  const renderFlow = () => (
    <TransactionFlowPanel
      stage={stage as TransactionFlowStage}
      actionLabel="borrow"
      amountLabel={`${safeAmountUsd.toFixed(0)} ${token.symbol}`}
      title="Borrow successful"
      subtitle={
        stage === "success"
          ? "Borrow completed."
          : `Borrow against ${pool.name}.`
      }
      visual={<TokenBubble visual={homeVisualToBorrowVisual(token.visual)} size="sm" />}
      rows={
        stage === "success"
          ? [
              { label: "Borrow APR", value: `${token.borrowApr.toFixed(1)}%`, tone: "warning" as const },
              { label: "Health factor", value: formatHealthFactor(projectedHealthFactor), tone: "positive" as const },
              { label: "Remaining borrow power", value: formatUsdExact(Math.max(0, pool.borrowPowerUsd - projectedDebtUsd)) },
            ]
          : flowRows
      }
      note={
        preview.warningTitle ? "Borrow carefully." : "Approve wallet, then wait for confirmation."
      }
      primaryLabel={stage === "review" ? "Continue" : stage === "approve" ? "Approve wallet" : "Done"}
      onPrimary={() => {
        if (stage === "review") setStage("approve")
        else if (stage === "approve") setStage("processing")
        else handleClose()
      }}
      onBack={() => setStage("entry")}
      onClose={handleClose}
      className="rounded-none border-0 bg-transparent shadow-none"
      variant="bare"
    />
  )

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : null)}>
      <DialogContent
        fullScreenOnMobile
        hideMobileHandle
        className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-radius-md border border-border bg-background p-0 shadow-elev-3"
      >
        <DialogTitle className="sr-only">Borrow against collateral</DialogTitle>
        {stage === "entry" ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <span className="text-[13px] font-medium text-foreground">Borrow against collateral</span>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="border-b border-border pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TokenBubble visual={visuals[0]} size="md" />
                    <TokenBubble visual={visuals[1]} size="md" className="-ml-2" />
                    <div>
                      <div className="text-[13.5px] font-medium text-foreground">{pool.name}</div>
                      <div className="text-xs text-muted-foreground">{pool.venue}</div>
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                  <MetricCell label="Collateral" value={formatUsdExact(pool.collateralUsd)} />
                  <MetricCell label="Borrow power" value={formatUsdExact(pool.borrowPowerUsd)} />
                  <MetricCell label="Max LTV" value={`${pool.maxLtv}%`} />
                </dl>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="borrow-amount" className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    You borrow
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmountInput(Math.max(0, pool.borrowPowerUsd - currentDebtUsd).toFixed(0))}
                    className="text-[11.5px] font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Max
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="borrow-amount"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(event) => setAmountInput(sanitizeNumericInput(event.target.value))}
                    placeholder="0"
                    className="flex-1 border-none bg-transparent font-data text-[24px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-inset px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface-hover"
                      >
                        <TokenBubble visual={homeVisualToBorrowVisual(token.visual)} size="xs" />
                        {token.symbol}
                        <ChevronDown className="size-3 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {tokenOptions.map((option) => (
                        <DropdownMenuItem key={option.id} onSelect={() => setTokenId(option.id)}>
                          <TokenBubble visual={homeVisualToBorrowVisual(option.visual)} size="xs" className="mr-2" />
                          <span className="flex-1">{option.symbol}</span>
                          <span className="text-[11px] text-muted-foreground">{option.borrowApr.toFixed(1)}%</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">~ {formatUsdExact(safeAmountUsd)}</div>
              </div>

              <dl className="divide-y divide-border border-y border-border">
                <StatLine label="After borrow" value={formatUsdExact(projectedDebtUsd)} />
                <StatLine
                  label="Health factor"
                  value={
                    <span className="flex items-center gap-1.5">
                      <HfNumber value={formatHealthFactor(currentHealthFactor)} tone={healthFactorToneClass(currentHealthFactor)} size="sm" />
                      <span className="text-muted-foreground">{"->"}</span>
                      <HfNumber value={formatHealthFactor(projectedHealthFactor)} tone={healthFactorToneClass(projectedHealthFactor)} size="sm" />
                    </span>
                  }
                />
                <StatLine label="Remaining power" value={formatUsdExact(Math.max(0, pool.borrowPowerUsd - projectedDebtUsd))} />
              </dl>

              {preview.warningTitle ? (
                <div className="border-t border-border pt-3 text-[11.5px] text-muted-foreground">
                  <div className="font-medium text-foreground">{preview.warningTitle}</div>
                  <div className="mt-0.5">{preview.warningMessage}</div>
                </div>
              ) : null}

              <PillButton
                variant="primary"
                size="md"
                className="w-full"
                disabled={ctaDisabled}
                onClick={() => setStage("review")}
              >
                {preview.isEmpty ? "Enter an amount" : exceedsPower ? "Exceeds borrow power" : "Review borrow"}
              </PillButton>
            </div>
          </>
        ) : stage === "review" ? (
          renderReview()
        ) : (
          renderFlow()
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReviewRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "positive"
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[14px] text-foreground">{label}</span>
      <span className={tone === "positive" ? "text-[14px] font-medium text-emerald-600" : "text-[14px] font-medium text-foreground"}>
        {value}
      </span>
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-data text-[12.5px] font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { TransactionFlowPanel, type TransactionFlowStage } from "@/app/components/transaction-flow"
import {
  HOME_BORROW_TOKENS,
  HOME_COLLATERAL_POOLS,
  type BorrowPreview,
  formatHealthFactor,
  type HomeBorrowToken,
  type HomeCollateralPool,
  formatUsdExact,
  homeVisualToBorrowVisual,
} from "@/app/lib/data/borrow-domain"
import { HomeBorrowPanel } from "@/app/components/home-borrow-panel"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"
import { PillButton, TokenBubble } from "./atoms"

type ModalStage = "entry" | TransactionFlowStage

export type BorrowModalContext = {
  pool: HomeCollateralPool
  currentDebtUsd: number
  defaultTokenId?: string
  tokenOptions?: HomeBorrowToken[]
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

function buildBorrowPreview(pool: HomeCollateralPool, currentDebtUsd: number, amountUsd: number): BorrowPreview {
  const projectedDebtUsd = currentDebtUsd + amountUsd
  const healthFactor = projectedDebtUsd > 0 ? pool.liquidationUsd / projectedDebtUsd : Number.POSITIVE_INFINITY
  const exceedsBorrowPower = projectedDebtUsd > pool.borrowPowerUsd

  return {
    amountUsd,
    amountLabel: formatUsdExact(amountUsd),
    isEmpty: amountUsd <= 0,
    isValid: amountUsd > 0 && !exceedsBorrowPower,
    exceedsBorrowPower,
    healthFactor: Number.isFinite(healthFactor) ? healthFactor : null,
    healthFactorLabel: formatHealthFactor(Number.isFinite(healthFactor) ? healthFactor : null),
    riskTone: exceedsBorrowPower ? "danger" : healthFactor < 1.2 ? "danger" : healthFactor < 1.5 ? "warning" : "positive",
    progressPercent: Math.min(100, Math.max(0, (projectedDebtUsd / Math.max(pool.borrowPowerUsd, 1)) * 100)),
    remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - projectedDebtUsd),
    warningTitle: exceedsBorrowPower ? "Borrowing power exceeded" : healthFactor < 1.2 ? "Credit health is weak" : null,
    warningMessage: exceedsBorrowPower
      ? "Reduce the amount or add more collateral before borrowing."
      : healthFactor < 1.2
        ? "This borrow would move the position close to liquidation."
        : null,
    ctaLabel: exceedsBorrowPower ? "Adjust amount" : "Review borrow",
  }
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
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false)
  const tokenOptions = context?.tokenOptions ?? []
  const availableTokens = tokenOptions.length > 0 ? tokenOptions : HOME_BORROW_TOKENS

  useEffect(() => {
    if (open && context) {
      setAmountInput(initialAmount ?? "")
      setTokenId(initialTokenId ?? context.defaultTokenId ?? context.tokenOptions?.[0]?.id ?? "usdc")
      setStage(startStage)
      setTokenPickerOpen(false)
    }
  }, [initialAmount, initialTokenId, open, context, startStage])

  const token = useMemo(
    () => availableTokens.find((candidate) => candidate.id === tokenId) ?? availableTokens[0] ?? null,
    [availableTokens, tokenId],
  )

  const amountUsd = Number.parseFloat(amountInput)
  const safeAmountUsd = Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : 0

  const preview = useMemo(() => {
    if (!context) return null
    return buildBorrowPreview(context.pool, context.currentDebtUsd, safeAmountUsd)
  }, [context, safeAmountUsd])

  const pool = context?.pool ?? HOME_COLLATERAL_POOLS[0]
  const currentDebtUsd = context?.currentDebtUsd ?? 0
  const visuals = pool.visuals.map(homeVisualToBorrowVisual) as [
    ReturnType<typeof homeVisualToBorrowVisual>,
    ReturnType<typeof homeVisualToBorrowVisual>,
  ]
  const currentHealthFactor = currentDebtUsd > 0 ? pool.liquidationUsd / currentDebtUsd : Number.POSITIVE_INFINITY
  const projectedDebtUsd = currentDebtUsd + safeAmountUsd
  const projectedHealthFactor = projectedDebtUsd > 0 ? pool.liquidationUsd / projectedDebtUsd : Number.POSITIVE_INFINITY
  const aaveFooterNote = (
    <>
      Powered by Aave v4.{" "}
      <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
        Learn More
      </a>
    </>
  )

  useEffect(() => {
    if (stage !== "processing") {
      return
    }

    const timer = window.setTimeout(() => {
      onConfirm({
        pool,
        token: token ?? { id: "usdc", name: "USD Coin", symbol: "USDC", subtitle: "Stablecoin", borrowApr: 0, visual: pool.visuals[0] },
        amountUsd: safeAmountUsd,
        healthFactorBefore: Number.isFinite(currentHealthFactor) ? currentHealthFactor : null,
        healthFactorAfter: Number.isFinite(projectedHealthFactor) ? projectedHealthFactor : null,
        remainingBorrowPowerUsd: Math.max(0, pool.borrowPowerUsd - projectedDebtUsd),
      })
      setStage("success")
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [currentHealthFactor, onConfirm, pool, projectedDebtUsd, projectedHealthFactor, safeAmountUsd, stage, token])

  if (!context || !preview || !token) {
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
          <ReviewRow label="Borrowing power used" value={`${Math.min(100, (projectedDebtUsd / Math.max(pool.borrowPowerUsd, 1)) * 100).toFixed(0)}%`} tone="positive" />
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
          className="mt-4 h-12 w-full rounded-[14px] bg-[hsl(var(--brand))] text-[15px] text-white shadow-elev-1 hover:bg-[hsl(var(--brand))]/90"
          onClick={() => setStage("approve")}
        >
          Borrow now
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
        preview.warningTitle ? "Borrow carefully." : undefined
      }
      footerNote={aaveFooterNote}
      primaryLabel={stage === "review" ? "Borrow now" : stage === "approve" ? "Approve wallet" : "Done"}
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
          <div className="flex h-full min-h-0 flex-col bg-background sm:h-auto">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8 sm:pb-5 sm:pt-6">
              <HomeBorrowPanel
                pool={pool}
                token={token}
                amount={amountInput}
                preview={preview}
                poolReadOnly
                flatHero
                submitLabel="Review borrow"
                onAmountChange={setAmountInput}
                onOpenPoolSheet={() => {}}
                onOpenTokenSheet={() => setTokenPickerOpen(true)}
                onSubmit={() => setStage("review")}
              />

              <div className="mt-auto pt-3 text-center text-[12px] text-muted-foreground">
                {aaveFooterNote}
              </div>
            </div>

            <TokenPickerDialog
              open={tokenPickerOpen}
              onOpenChange={setTokenPickerOpen}
              selectedTokenId={token.id}
              tokens={availableTokens}
              onSelect={(nextTokenId) => {
                setTokenId(nextTokenId)
                setTokenPickerOpen(false)
              }}
            />
          </div>
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

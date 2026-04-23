"use client"

import * as React from "react"
import { toast } from "sonner"
import type { PoolDetail } from "@/app/lib/borrow-detail"
import {
  calculateBorrowPreview,
  formatCompactUsd,
  formatHealthFactor,
  getBorrowTokenById,
  getPoolById,
  type HomeAssetVisual,
  type HomeCollateralPool,
} from "@/app/lib/home-sim"
import { CompactBorrowCard } from "@/app/components/home/borrow-card"
import { ActionSuccessDialog } from "@/app/components/home/action-success-dialog"
import { TokenPickerDialog } from "@/app/components/home/token-picker-dialog"
import type { HomeSuccessState } from "@/app/components/home/types"
import { cn } from "@/lib/utils"

type Props = {
  detail: PoolDetail
  className?: string
}

/**
 * Right-column sidebar on the pool detail page. Reuses the home-page
 * `CompactBorrowCard` as-is (no styling forks) and only feeds it props:
 *
 * - The pool is LOCKED to the current detail page (home catalog entry if
 *   available, otherwise an adapter built from PoolDetail).
 * - The borrow token picker reuses the home `TokenPickerDialog`.
 * - Submission goes to the home `ActionSuccessDialog` for identical UX.
 */
export function PoolBorrowSidebar({ detail, className }: Props) {
  const pool = React.useMemo(() => resolvePool(detail), [detail])

  const [tokenId, setTokenId] = React.useState<string | null>(null)
  const [amount, setAmount] = React.useState("")
  const [tokenDialogOpen, setTokenDialogOpen] = React.useState(false)
  const [successState, setSuccessState] = React.useState<HomeSuccessState | null>(null)

  const token = React.useMemo(() => (tokenId ? getBorrowTokenById(tokenId) : null), [tokenId])

  const preview = React.useMemo(() => {
    const p = calculateBorrowPreview(pool, Number.parseFloat(amount) || 0, token?.symbol ?? "Tokens")
    if (!token) {
      p.isValid = false
      p.ctaLabel = "Select token"
    }
    return p
  }, [amount, pool, token])

  const handleSubmit = () => {
    if (!preview.isValid || preview.isEmpty || !token) {
      if (!token) toast.warning("Select a token to borrow")
      return
    }
    setSuccessState({
      emoji: "💎",
      title: "Borrowed",
      amount: `${formatCompactUsd(preview.amountUsd)} ${token.symbol}`,
      description: "Your collateral is pulling weight. Funds are on the way.",
      rows: [
        { label: "Collateral", value: `${formatCompactUsd(pool.collateralUsd)} ${pool.name}` },
        {
          label: "Health factor",
          value: formatHealthFactor(preview.healthFactor),
          tone: preview.riskTone === "neutral" ? "default" : preview.riskTone,
        },
        {
          label: "Remaining borrow power",
          value: formatCompactUsd(preview.remainingBorrowPowerUsd),
          tone: "positive",
        },
      ],
    })
    setAmount("")
    toast.success(`Borrowed ${formatCompactUsd(preview.amountUsd)} ${token.symbol}`)
  }

  return (
    <>
      <aside
        className={cn("flex w-full flex-col gap-3", className)}
        aria-label={`Borrow against ${detail.hero.name}`}
      >
        <CompactBorrowCard
          pool={pool}
          token={token}
          amount={amount}
          preview={preview}
          onAmountChange={setAmount}
          onOpenPoolDialog={() => undefined}
          onOpenTokenDialog={() => setTokenDialogOpen(true)}
          onQuickTokenSelect={(id) => setTokenId(id)}
          onSetMax={() => setAmount(String(pool.borrowPowerUsd))}
          onSubmit={handleSubmit}
        />
      </aside>

      <TokenPickerDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        selectedTokenId={tokenId}
        onSelect={(id) => {
          setTokenId(id)
          setTokenDialogOpen(false)
        }}
      />

      <ActionSuccessDialog state={successState} onClose={() => setSuccessState(null)} />
    </>
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

function toHomeVisual(v: PoolDetail["hero"]["visuals"][number]): HomeAssetVisual {
  return {
    symbol: v.symbol,
    shortLabel: v.shortLabel,
    bgClassName: v.bgClass,
    textClassName: v.textClass,
  }
}

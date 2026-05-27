"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Lock, Settings } from "lucide-react"
import { toast } from "sonner"
import {
  HOME_CLAIM_POSITIONS,
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
  getPoolById,
  type HomeMode,
  type HomeSuccessRow,
} from "@/app/lib/home-sim"
import { useMediaQuery } from "@/app/lib/use-media-query"
import { PairVisual, TokenBubble } from "@/app/components/home-workspace-primitives"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TransactionFlowPanel,
  type TransactionFlowStage,
  type TransactionSuccessState,
} from "@/app/components/transaction-flow"
import { CompactClaimCard } from "./home/claim-card"
import { CompactRemoveCard } from "./home/remove-card"
import { CompactRepayCard } from "./home/repay-card"
import { HomePreviewPanel } from "./home/preview-panel"
import { PoolPickerDialog } from "./home/pool-picker-dialog"
import { TokenPickerDialog } from "./home/token-picker-dialog"
import type { PoolDialogMode } from "./home/types"
import { HomeBorrowPanel } from "./home-borrow-panel"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

type HomeFlowState = {
  mode: HomeMode
  stage: TransactionFlowStage
  success?: TransactionSuccessState
}

// TODO(wallet): replace fake APRs with on-chain market APRs indexed by pool id
const REPAY_APR_BY_POOL_ID: Record<string, number> = {
  "eth-usdc": 5.2,
  "usdc-usdt": 3.9,
  "wbtc-eth": 0,
}

export function HomePageClient() {
  const isDesktop = useMediaQuery("(min-width: 768px)", true)

  // TODO(wallet): when wallet is connected, hydrate these from the user's
  // actual LP positions + debt balances instead of HOME_DEFAULT_SELECTIONS /
  // HOME_INITIAL_* fixtures. Shape should stay the same so the cards below
  // don't need to change.
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
  const [homeFlow, setHomeFlow] = useState<HomeFlowState | null>(null)

  const borrowPool = useMemo(() => getPoolById(borrowPoolId), [borrowPoolId])
  const borrowToken = useMemo(() => (borrowTokenId ? getBorrowTokenById(borrowTokenId) : null), [borrowTokenId])
  const borrowPreview = useMemo(() => {
    const preview = calculateBorrowPreview(borrowPool, Number.parseFloat(borrowAmount) || 0, borrowToken?.symbol ?? "Tokens")
    if (!borrowToken) {
      preview.isValid = false
      preview.ctaLabel = "Select token"
    }
    return preview
  }, [borrowAmount, borrowPool, borrowToken])

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

  const activeFlow = homeFlow?.mode === mode ? homeFlow : null
  const activeFlowStage = activeFlow?.stage ?? "review"

  useEffect(() => {
    if (homeFlow?.stage !== "processing") {
      return
    }

    const timer = window.setTimeout(() => {
      if (homeFlow.mode === "borrow" && borrowToken) {
        const amountUsd = Number.parseFloat(borrowAmount) || 0
        const nextDebt = (debts[borrowPoolId] ?? 0) + amountUsd
        const nextHealthFactor = (borrowPool.collateralUsd * (borrowPool.maxLtv / 100)) / nextDebt

        setDebts((currentValue) => ({ ...currentValue, [borrowPoolId]: nextDebt }))
        setBorrowAmount("")
        setHomeFlow({
          mode: "borrow",
          stage: "success",
            success: {
              amountLabel: `${amountUsd.toFixed(0)} ${borrowToken.symbol}`,
              title: "Borrow successful",
            description: "Borrow completed.",
            rows: [
              { label: "Borrow APR", value: `${borrowToken.borrowApr.toFixed(1)}%`, tone: "warning" },
              { label: "Health factor", value: formatHealthFactor(nextHealthFactor), tone: "positive" },
              { label: "Remaining borrow power", value: formatCompactUsd(Math.max(0, borrowPool.borrowPowerUsd - nextDebt)) },
            ],
          },
        })
        toast.success(`Borrowed ${amountUsd.toFixed(0)} ${borrowToken.symbol}`)
        return
      }

      if (homeFlow.mode === "repay") {
        const amountUsd = Number.parseFloat(repayAmount) || 0
        const remainingDebtUsd = Math.max(0, (debts[repayPoolId] ?? 0) - amountUsd)

        setDebts((currentValue) => ({ ...currentValue, [repayPoolId]: remainingDebtUsd }))
        setRepayAmount("")
        setHomeFlow({
          mode: "repay",
          stage: "success",
            success: {
              amountLabel: `${formatCompactUsd(amountUsd)} USDC`,
              title: "Repayment successful",
            description: "Repayment completed.",
            rows: [
              {
                label: "Remaining debt",
                value: `${formatCompactUsd(remainingDebtUsd)} USDC`,
                tone: remainingDebtUsd === 0 ? "positive" : "warning",
              },
              { label: "Health factor", value: repayPreview.healthFactorAfterLabel, tone: "positive" },
              { label: "Interest saved / yr", value: formatCompactUsd(repayPreview.yearlyInterestSavedUsd), tone: "positive" },
            ],
          },
        })
        toast.success(`Repaid ${formatCompactUsd(amountUsd)} USDC`)
        return
      }

      if (homeFlow.mode === "claim") {
        const rows = Object.entries(claimPreview.tokenTotals)
          .filter(([, value]) => value > 0)
          .slice(0, 3)
          .map(([symbol, value]) => ({
            label: `${symbol} received`,
            value: getClaimBreakdownLabel(symbol, value),
            tone: "positive" as const,
          }))

        setClaimableTotals((currentValue) => {
          const nextValue = { ...currentValue }
          claimPreview.selectedPositionIds.forEach((positionId) => {
            nextValue[positionId] = 0
          })
          return nextValue
        })
        setClaimAmount("")
        setHomeFlow({
          mode: "claim",
          stage: "success",
            success: {
              amountLabel: formatUsd(claimPreview.effectiveClaimUsd),
              title: "Claim successful",
            description: "Fees claimed.",
            rows,
          },
        })
        toast.success(`Claimed ${formatUsd(claimPreview.effectiveClaimUsd)} in fees`)
        return
      }

      if (homeFlow.mode === "remove") {
        setHomeFlow({
          mode: "remove",
          stage: "success",
            success: {
              amountLabel: `${removePercent}% · ${formatCompactUsd(removePreview.removeUsd)}`,
              title: "Removal successful",
            description: "Collateral removed.",
            rows: [
              { label: "Received", value: formatCompactUsd(removePreview.removeUsd), tone: "positive" },
              { label: "Remaining collateral", value: formatCompactUsd(removePreview.afterCollateralUsd) },
              { label: "Health factor", value: removePreview.healthFactorAfterLabel, tone: removePreview.isUnsafe ? "danger" : "positive" },
            ],
          },
        })
        toast.success(`Removed ${removePercent}% from ${removePool.name}`)
      }
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [
    borrowAmount,
    borrowPool,
    borrowPoolId,
    borrowToken,
    claimPreview,
    debts,
    homeFlow,
    removePercent,
    removePool,
    removePreview,
    repayAmount,
    repayPoolId,
    repayPreview,
  ])

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

  const startFlow = (nextMode: HomeMode) => {
    setHomeFlow({ mode: nextMode, stage: "review" })
  }

  const closeFlow = () => {
    if (homeFlow?.stage === "processing") {
      return
    }
    setHomeFlow(null)
  }

  const advanceFlow = () => {
    if (!activeFlow) {
      return
    }

    if (activeFlow.stage === "review") {
      setHomeFlow({ mode: activeFlow.mode, stage: "approve" })
      return
    }

    if (activeFlow.stage === "approve") {
      setHomeFlow({ mode: activeFlow.mode, stage: "processing" })
      return
    }

    setHomeFlow(null)
  }

  const flowVisual = useMemo(() => {
    if (!activeFlow) return null

    if (activeFlow.mode === "borrow" && borrowToken) {
      return <TokenBubble visual={borrowToken.visual} className="size-8" />
    }

    if (activeFlow.mode === "repay") {
      return <TokenBubble visual={getBorrowTokenById("usdc").visual} className="size-8" />
    }

    if (activeFlow.mode === "claim" || activeFlow.mode === "remove") {
      const pool = activeFlow.mode === "claim" ? getPoolById(HOME_CLAIM_POSITIONS.find((position) => claimSelections[position.id])?.poolId ?? HOME_DEFAULT_SELECTIONS.borrowPoolId) : removePool
      return <PairVisual visuals={pool.visuals} className="h-8 w-12 [&>span]:size-8 [&>span:nth-child(2)]:left-4" />
    }

    return null
  }, [activeFlow, borrowToken, claimSelections, removePool])

  const flowHero = useMemo(() => {
    if (!activeFlow) return null

    const pairHeroClassName =
      "h-[72px] w-[108px] [&>span]:size-[72px] [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[2.25rem] [&>span]:ring-0 sm:h-[58px] sm:w-[88px] sm:[&>span]:size-[58px] sm:[&>span:nth-child(2)]:left-[1.85rem]"
    const tokenHeroClassName = "size-[72px] text-[18px] ring-0 sm:size-[58px] sm:text-[15px]"
    const lockBadgeClassName =
      "absolute bottom-0 left-[2.9rem] inline-flex size-7 items-center justify-center rounded-full border border-border bg-background sm:left-[2.35rem] sm:size-6"

    if (activeFlow.mode === "borrow" && borrowToken) {
      return (
        <div className="flex items-center gap-3 sm:gap-2.5">
          <div className="relative">
            <PairVisual visuals={borrowPool.visuals} className={pairHeroClassName} />
            <span className={lockBadgeClassName}>
              <Lock className="size-3 text-foreground" />
            </span>
          </div>
          <ArrowRight className="size-4 text-foreground" aria-hidden />
          <TokenBubble visual={borrowToken.visual} className={tokenHeroClassName} />
        </div>
      )
    }

    if (activeFlow.mode === "repay") {
      return (
        <div className="flex items-center gap-3 sm:gap-2.5">
          <TokenBubble visual={getBorrowTokenById("usdc").visual} className={tokenHeroClassName} />
          <ArrowRight className="size-4 text-foreground" aria-hidden />
          <div className="relative">
            <PairVisual visuals={repayPool.visuals} className={pairHeroClassName} />
            <span className={lockBadgeClassName}>
              <Lock className="size-3 text-foreground" />
            </span>
          </div>
        </div>
      )
    }

    if (activeFlow.mode === "claim") {
      const selectedPosition =
        HOME_CLAIM_POSITIONS.find((position) => claimSelections[position.id]) ??
        HOME_CLAIM_POSITIONS[0]

      return (
        <div className="flex items-center gap-3 sm:gap-2.5">
          <div className="relative">
            <PairVisual
              visuals={[selectedPosition.breakdown[0].visual, selectedPosition.breakdown[1]?.visual ?? selectedPosition.breakdown[0].visual]}
              className={pairHeroClassName}
            />
          </div>
          <ArrowRight className="size-4 text-foreground" aria-hidden />
          <TokenBubble visual={selectedPosition.breakdown[0].visual} className={tokenHeroClassName} />
        </div>
      )
    }

    if (activeFlow.mode === "remove") {
      return (
        <div className="flex items-center gap-3 sm:gap-2.5">
          <div className="relative">
            <PairVisual visuals={removePool.visuals} className={pairHeroClassName} />
            <span className={lockBadgeClassName}>
              <Lock className="size-3 text-foreground" />
            </span>
          </div>
          <ArrowRight className="size-4 text-foreground" aria-hidden />
          <PairVisual visuals={removePool.visuals} className={pairHeroClassName} />
        </div>
      )
    }

    return null
  }, [activeFlow, borrowPool.visuals, borrowToken, claimSelections, removePool.visuals, repayPool.visuals])

  const flowConfig = useMemo(() => {
    if (!activeFlow) {
      return null
    }

    const aaveFooterNote = (
      <>
        Powered by Aave v4.{" "}
        <a href="https://aave.com/docs/aave-v4" target="_blank" rel="noreferrer" className="text-accent-emphasis">
          Learn More
        </a>
      </>
    )

    if (activeFlow.stage === "success" && activeFlow.success) {
        return {
          actionLabel: activeFlow.mode,
        amountLabel: activeFlow.success.amountLabel,
        title: activeFlow.success.title,
        subtitle: activeFlow.success.description,
        rows: activeFlow.success.rows,
        note: undefined,
        progressLabel: undefined,
        progressPercent: undefined,
        progressLeftLabel: undefined,
        progressRightLabel: undefined,
        feeValue: "$0",
        footerNote: aaveFooterNote,
      }
    }

    switch (activeFlow.mode) {
      case "borrow":
        const borrowPowerUsedPct = borrowPool.borrowPowerUsd > 0 ? Math.min(100, ((borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd) / borrowPool.borrowPowerUsd) * 100) : 0
        return {
          actionLabel: "borrow",
          amountLabel: `Borrow ${formatCompactUsd(Number.parseFloat(borrowAmount || "0"))} in ${borrowToken?.symbol ?? ""}`.trim(),
          title: "Borrow successful",
          subtitle: `with ${borrowPool.visuals[0].symbol} / ${borrowPool.visuals[1].symbol} as collateral`,
          rows: [
            { label: "Collateral", value: formatCompactUsd(borrowPool.collateralUsd) },
            { label: "Health factor", value: borrowPreview.healthFactorLabel, tone: borrowPreview.riskTone === "danger" ? "danger" : "positive" },
            { label: "Borrow APY", value: `${borrowToken?.borrowApr.toFixed(1) ?? "0.0"}%`, tone: "warning" },
            { label: "Pool APY", value: `${borrowPool.pairApr.toFixed(1)}%` },
          ] as HomeSuccessRow[],
          note: borrowPreview.warningTitle ? "Borrow carefully." : undefined,
          progressLabel: "Borrow power used",
          progressPercent: borrowPowerUsedPct,
          progressLeftLabel: `${formatCompactUsd(borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd)} used`,
          progressRightLabel: `${formatCompactUsd(borrowPreview.remainingBorrowPowerUsd)} available`,
          feeValue: "$0",
          footerNote: aaveFooterNote,
        }
      case "repay":
        return {
          actionLabel: "repayment",
          amountLabel: `Repay ${formatCompactUsd(Number.parseFloat(repayAmount || "0"))} in USDC`,
          title: "Repayment successful",
          subtitle: `against ${repayPool.visuals[0].symbol} / ${repayPool.visuals[1].symbol} collateral`,
          rows: [
            { label: "Current debt", value: `${formatCompactUsd(debts[repayPoolId] ?? 0)} USDC` },
            { label: "Remaining debt", value: repayPreview.remainingDebtLabel },
            { label: "Health factor", value: `${repayPreview.oldHealthFactorLabel} -> ${repayPreview.healthFactorAfterLabel}`, tone: "positive" },
            { label: "Interest saved / yr", value: formatCompactUsd(repayPreview.yearlyInterestSavedUsd), tone: "positive" },
          ] as HomeSuccessRow[],
          note: undefined,
          progressLabel: "Debt repaid",
          progressPercent: (debts[repayPoolId] ?? 0) > 0 ? Math.min(100, (((debts[repayPoolId] ?? 0) - repayPreview.remainingDebtUsd) / (debts[repayPoolId] ?? 1)) * 100) : 0,
          progressLeftLabel: `${formatCompactUsd((debts[repayPoolId] ?? 0) - repayPreview.remainingDebtUsd)} repaid`,
          progressRightLabel: `${repayPreview.remainingDebtLabel} left`,
          feeValue: "$0",
          footerNote: aaveFooterNote,
        }
      case "claim":
        const selectedPositionCount = claimPreview.selectedPositionIds.length
        const selectedPosition =
          HOME_CLAIM_POSITIONS.find((position) => claimPreview.selectedPositionIds.includes(position.id)) ??
          HOME_CLAIM_POSITIONS[0]
        return {
          actionLabel: "claim",
          amountLabel: `Claim ${formatUsd(claimPreview.effectiveClaimUsd)}`,
          title: "Claim successful",
          subtitle:
            selectedPositionCount > 1
              ? `from ${selectedPositionCount} collateral positions`
              : `from ${selectedPosition.name}`,
          rows: [
            { label: "Positions selected", value: String(claimPreview.selectedPositionIds.length) },
            { label: "Total claimable", value: formatUsd(claimPreview.selectedTotalUsd) },
            { label: "Claim amount", value: formatUsd(claimPreview.effectiveClaimUsd), tone: "positive" },
          ] as HomeSuccessRow[],
          note: undefined,
          progressLabel: "Positions selected",
          progressPercent: HOME_CLAIM_POSITIONS.length > 0 ? (claimPreview.selectedPositionIds.length / HOME_CLAIM_POSITIONS.length) * 100 : 0,
          progressLeftLabel: `${claimPreview.selectedPositionIds.length} selected`,
          progressRightLabel: `${HOME_CLAIM_POSITIONS.length - claimPreview.selectedPositionIds.length} remaining`,
          feeValue: "$0",
          footerNote: aaveFooterNote,
        }
      case "remove":
        return {
          actionLabel: "removal",
          amountLabel: `Remove ${removePercent}% collateral`,
          title: "Removal successful",
          subtitle: `from ${removePool.visuals[0].symbol} / ${removePool.visuals[1].symbol}`,
          rows: [
            { label: "Returned to wallet", value: formatCompactUsd(removePreview.removeUsd), tone: "positive" },
            { label: "Remaining collateral", value: formatCompactUsd(removePreview.afterCollateralUsd) },
            { label: "Health factor", value: removePreview.healthFactorAfterLabel, tone: removePreview.isUnsafe ? "danger" : "positive" },
            { label: "Safe max", value: `${removePreview.safePercent}%` },
          ] as HomeSuccessRow[],
          note: removePreview.isUnsafe ? "This removal would be unsafe." : undefined,
          progressLabel: "Collateral removed",
          progressPercent: removePercent,
          progressLeftLabel: `${formatCompactUsd(removePreview.removeUsd)} removed`,
          progressRightLabel: `${formatCompactUsd(removePreview.afterCollateralUsd)} left`,
          feeValue: "$0",
          footerNote: aaveFooterNote,
        }
    }
  }, [
    activeFlow,
    borrowAmount,
    borrowPool,
    borrowPreview,
    borrowToken,
    claimPreview,
    debts,
    removePercent,
    removePool,
    removePreview,
    repayAmount,
    repayPool,
    repayPoolId,
    repayPreview,
  ])

  const flowPrimaryLabel = activeFlow?.stage === "review" ? "Continue" : activeFlow?.stage === "approve" ? "Approve wallet" : "Done"
  const showInlineFlow = Boolean(activeFlow) && isDesktop
  const showMobileFlow = Boolean(activeFlow) && !isDesktop

  const showSidePanel =
    !activeFlow &&
    ((mode === "borrow" && (Number.parseFloat(borrowAmount) || 0) > 0) ||
      (mode === "repay" && (Number.parseFloat(repayAmount) || 0) > 0) ||
      (mode === "remove" && removePercent > 0))

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex items-start justify-center py-4 md:py-6">
          <div className="flex w-full items-stretch justify-center gap-4">
            <div className="w-full max-w-[420px] self-stretch md:max-w-[460px]">
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  if (homeFlow?.stage === "processing") return
                  const nextMode = value as HomeMode
                  setMode(nextMode)
                  if (homeFlow && homeFlow.mode !== nextMode) {
                    setHomeFlow(null)
                  }
                }}
                className="w-full"
              >
                <div className="mb-4 flex items-center justify-between">
                  <TabsList className="w-full justify-start">
                    {HOME_MODE_ITEMS.map((item) => (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className="text-[14px] font-normal data-[state=active]:text-[hsl(var(--brand))] data-[state=active]:after:bg-[hsl(var(--brand))]"
                      >
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <button
                    type="button"
                    className="ml-2 inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-surface-inset hover:text-foreground"
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative min-h-[320px]">
                  <TabsContent value="borrow" className="mt-0">
                    {showInlineFlow && activeFlow?.mode === "borrow" && activeFlowStage === "review" && borrowToken ? (
                      <BorrowReviewScreen
                        borrowTitle={`Borrow ${formatCompactUsd(Number.parseFloat(borrowAmount || "0"))} in ${borrowToken.symbol}`}
                        collateralSubtitle={`with ${borrowPool.visuals[0].symbol} / ${borrowPool.visuals[1].symbol} as collateral`}
                        collateralAmount={formatCompactUsd(borrowPool.collateralUsd)}
                        borrowApr={`${borrowToken.borrowApr.toFixed(1)}%`}
                        healthFactor={borrowPreview.healthFactorLabel}
                        poolApy={`${borrowPool.pairApr.toFixed(1)}%`}
                        borrowPowerUsedPct={borrowPool.borrowPowerUsd > 0 ? Math.min(100, ((borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd) / borrowPool.borrowPowerUsd) * 100) : 0}
                        borrowPowerUsedLabel={formatCompactUsd(borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd)}
                        borrowPowerRemainingLabel={formatCompactUsd(borrowPreview.remainingBorrowPowerUsd)}
                        feePaid="$0"
                        poolVisuals={borrowPool.visuals}
                        borrowVisual={borrowToken.visual}
                        onBack={() => setHomeFlow(null)}
                        onContinue={advanceFlow}
                        isMobile={false}
                      />
                    ) : showInlineFlow && flowConfig ? (
                      <TransactionFlowPanel
                        stage={activeFlowStage}
                        actionLabel={flowConfig.actionLabel}
                        amountLabel={flowConfig.amountLabel}
                        title={flowConfig.title}
                        subtitle={flowConfig.subtitle}
                        hero={flowHero}
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
                        progressLabel={flowConfig.progressLabel}
                        progressPercent={flowConfig.progressPercent}
                        progressLeftLabel={flowConfig.progressLeftLabel}
                        progressRightLabel={flowConfig.progressRightLabel}
                        feeValue={flowConfig.feeValue}
                        footerNote={flowConfig.footerNote}
                        primaryLabel={flowPrimaryLabel}
                        onPrimary={advanceFlow}
                        onBack={() => setHomeFlow(null)}
                        variant="surface"
                      />
                    ) : (
                      <HomeBorrowPanel
                        pool={borrowPool}
                        token={borrowToken}
                        amount={borrowAmount}
                        preview={borrowPreview}
                        submitLabel="Review borrow"
                        onAmountChange={setBorrowAmount}
                        onOpenPoolSheet={() => setPoolDialogMode("borrow")}
                        onOpenTokenSheet={() => setTokenDialogOpen(true)}
                        onSubmit={() => startFlow("borrow")}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="repay" className="mt-0">
                    {showInlineFlow && flowConfig ? (
                      <TransactionFlowPanel
                        stage={activeFlowStage}
                        actionLabel={flowConfig.actionLabel}
                        amountLabel={flowConfig.amountLabel}
                        title={flowConfig.title}
                        subtitle={flowConfig.subtitle}
                        hero={flowHero}
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
                        progressLabel={flowConfig.progressLabel}
                        progressPercent={flowConfig.progressPercent}
                        progressLeftLabel={flowConfig.progressLeftLabel}
                        progressRightLabel={flowConfig.progressRightLabel}
                        feeValue={flowConfig.feeValue}
                        footerNote={flowConfig.footerNote}
                        primaryLabel={flowPrimaryLabel}
                        onPrimary={advanceFlow}
                        onBack={() => setHomeFlow(null)}
                        variant="surface"
                      />
                    ) : (
                      <CompactRepayCard
                        pool={repayPool}
                        debtUsd={debts[repayPoolId] ?? 0}
                        amount={repayAmount}
                        preview={repayPreview}
                        submitLabel="Review repayment"
                        onOpenPoolDialog={() => setPoolDialogMode("repay")}
                        onAmountChange={setRepayAmount}
                        onSetMax={() => setRepayAmount(String(debts[repayPoolId] ?? 0))}
                        onSubmit={() => startFlow("repay")}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="claim" className="mt-0">
                    {showInlineFlow && flowConfig ? (
                      <TransactionFlowPanel
                        stage={activeFlowStage}
                        actionLabel={flowConfig.actionLabel}
                        amountLabel={flowConfig.amountLabel}
                        title={flowConfig.title}
                        subtitle={flowConfig.subtitle}
                        hero={flowHero}
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
                        progressLabel={flowConfig.progressLabel}
                        progressPercent={flowConfig.progressPercent}
                        progressLeftLabel={flowConfig.progressLeftLabel}
                        progressRightLabel={flowConfig.progressRightLabel}
                        feeValue={flowConfig.feeValue}
                        footerNote={flowConfig.footerNote}
                        primaryLabel={flowPrimaryLabel}
                        onPrimary={advanceFlow}
                        onBack={() => setHomeFlow(null)}
                        variant="surface"
                      />
                    ) : (
                      <CompactClaimCard
                        amount={claimAmount}
                        preview={claimPreview}
                        claimableTotals={claimableTotals}
                        selections={claimSelections}
                        submitLabel="Review claim"
                        onToggleSelection={(positionId) =>
                          setClaimSelections((currentValue) => ({
                            ...currentValue,
                            [positionId]: !currentValue[positionId],
                          }))
                        }
                        onAmountChange={setClaimAmount}
                        onSetAll={() => setClaimAmount(claimPreview.selectedTotalUsd.toFixed(2))}
                        onSubmit={() => startFlow("claim")}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="remove" className="mt-0">
                    {showInlineFlow && flowConfig ? (
                      <TransactionFlowPanel
                        stage={activeFlowStage}
                        actionLabel={flowConfig.actionLabel}
                        amountLabel={flowConfig.amountLabel}
                        title={flowConfig.title}
                        subtitle={flowConfig.subtitle}
                        hero={flowHero}
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
                        progressLabel={flowConfig.progressLabel}
                        progressPercent={flowConfig.progressPercent}
                        progressLeftLabel={flowConfig.progressLeftLabel}
                        progressRightLabel={flowConfig.progressRightLabel}
                        feeValue={flowConfig.feeValue}
                        footerNote={flowConfig.footerNote}
                        primaryLabel={flowPrimaryLabel}
                        onPrimary={advanceFlow}
                        onBack={() => setHomeFlow(null)}
                        variant="surface"
                      />
                    ) : (
                      <CompactRemoveCard
                        pool={removePool}
                        percent={removePercent}
                        preview={removePreview}
                        submitLabel="Review removal"
                        onOpenPoolDialog={() => setPoolDialogMode("remove")}
                        onPercentChange={setRemovePercent}
                        onSubmit={() => startFlow("remove")}
                      />
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <AnimatePresence initial={false}>
              {showSidePanel ? (
                <motion.aside
                  key="home-side-panel"
                  initial={{ opacity: 0, x: -8, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 280 }}
                  exit={{ opacity: 0, x: -8, width: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="hidden shrink-0 overflow-hidden pt-[52px] md:block"
                >
                  <div className="w-[280px] pr-2">
                    <HomePreviewPanel
                      mode={mode}
                      borrowPool={borrowPool}
                      borrowPreview={borrowPreview}
                      repayPool={repayPool}
                      repayDebtUsd={debts[repayPoolId] ?? 0}
                      repayPreview={repayPreview}
                      removePool={removePool}
                      removePercent={removePercent}
                      removePreview={removePreview}
                      removeDebtUsd={debts[removePoolId] ?? 0}
                    />
                  </div>
                </motion.aside>
              ) : null}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <Dialog open={showMobileFlow} onOpenChange={(open) => !open && closeFlow()}>
        <DialogContent
          fullScreenOnMobile
          hideMobileHandle
          className="w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-radius-md border border-border bg-background p-0 shadow-elev-3 max-sm:[&>*]:h-full max-sm:[&>*]:min-h-0"
        >
          <DialogTitle className="sr-only">Transaction preview</DialogTitle>
          {showMobileFlow && flowConfig && activeFlow?.mode === "borrow" && activeFlowStage === "review" && borrowToken ? (
            <BorrowReviewScreen
              borrowTitle={`Borrow ${formatCompactUsd(Number.parseFloat(borrowAmount || "0"))} in ${borrowToken.symbol}`}
              collateralSubtitle={`with ${borrowPool.visuals[0].symbol} / ${borrowPool.visuals[1].symbol} as collateral`}
              collateralAmount={formatCompactUsd(borrowPool.collateralUsd)}
              borrowApr={`${borrowToken.borrowApr.toFixed(1)}%`}
              healthFactor={borrowPreview.healthFactorLabel}
              poolApy={`${borrowPool.pairApr.toFixed(1)}%`}
              borrowPowerUsedPct={borrowPool.borrowPowerUsd > 0 ? Math.min(100, ((borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd) / borrowPool.borrowPowerUsd) * 100) : 0}
              borrowPowerUsedLabel={formatCompactUsd(borrowPool.borrowPowerUsd - borrowPreview.remainingBorrowPowerUsd)}
              borrowPowerRemainingLabel={formatCompactUsd(borrowPreview.remainingBorrowPowerUsd)}
              feePaid="$0"
              poolVisuals={borrowPool.visuals}
              borrowVisual={borrowToken.visual}
              onBack={() => setHomeFlow(null)}
              onContinue={advanceFlow}
              isMobile
            />
          ) : showMobileFlow && flowConfig ? (
            <TransactionFlowPanel
              stage={activeFlowStage}
              actionLabel={flowConfig.actionLabel}
              amountLabel={flowConfig.amountLabel}
              title={flowConfig.title}
              subtitle={flowConfig.subtitle}
              hero={flowHero}
              visual={flowVisual}
              rows={flowConfig.rows}
              note={flowConfig.note}
              progressLabel={flowConfig.progressLabel}
              progressPercent={flowConfig.progressPercent}
              progressLeftLabel={flowConfig.progressLeftLabel}
              progressRightLabel={flowConfig.progressRightLabel}
              feeValue={flowConfig.feeValue}
              footerNote={flowConfig.footerNote}
              primaryLabel={flowPrimaryLabel}
              onPrimary={advanceFlow}
              onBack={() => setHomeFlow(null)}
              onClose={closeFlow}
              className="rounded-none border-0 bg-transparent shadow-none"
              variant="bare"
            />
          ) : null}
        </DialogContent>
      </Dialog>

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
    </div>
  )
}

function BorrowReviewScreen({
  borrowTitle,
  collateralSubtitle,
  collateralAmount,
  borrowApr,
  healthFactor,
  poolApy,
  borrowPowerUsedPct,
  borrowPowerUsedLabel,
  borrowPowerRemainingLabel,
  feePaid,
  poolVisuals,
  borrowVisual,
  onBack,
  onContinue,
  isMobile = false,
}: {
  borrowTitle: string
  collateralSubtitle: string
  collateralAmount: string
  borrowApr: string
  healthFactor: string
  poolApy: string
  borrowPowerUsedPct: number
  borrowPowerUsedLabel: string
  borrowPowerRemainingLabel: string
  feePaid: string
  poolVisuals: [Parameters<typeof PairVisual>[0]["visuals"][0], Parameters<typeof PairVisual>[0]["visuals"][1]]
  borrowVisual: Parameters<typeof TokenBubble>[0]["visual"]
  onBack: () => void
  onContinue: () => void
  isMobile?: boolean
}) {
  return (
    <div className={isMobile ? "flex h-full min-h-0 flex-col bg-background" : "flex flex-col rounded-radius-md border border-border bg-background"}>
      <div className={isMobile ? "px-5 pt-[calc(env(safe-area-inset-top)+1rem)]" : "px-5 pt-5"}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className={isMobile ? "min-h-0 flex-1 overflow-y-auto px-8 pb-3 pt-6" : "px-8 pb-4 pt-6"}>
        <div className="flex flex-col items-center text-center">
          <div className={isMobile ? "flex items-center gap-3" : "flex items-center gap-2.5"}>
            <div className="relative">
              <PairVisual
                visuals={poolVisuals}
                className={isMobile ? "h-[72px] w-[108px] [&>span]:size-[72px] [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[2.25rem] [&>span]:ring-0" : "h-[58px] w-[88px] [&>span]:size-[58px] [&>span:nth-child(1)]:left-0 [&>span:nth-child(2)]:left-[1.85rem] [&>span]:ring-0"}
              />
              <span className={isMobile ? "absolute bottom-0 left-[2.9rem] inline-flex size-7 items-center justify-center rounded-full border border-border bg-background" : "absolute bottom-0 left-[2.35rem] inline-flex size-6 items-center justify-center rounded-full border border-border bg-background"}>
                <Lock className="size-3 text-foreground" />
              </span>
            </div>
            <ArrowRight className="size-4 text-foreground" aria-hidden />
            <TokenBubble visual={borrowVisual} className={isMobile ? "size-[72px] text-[18px] ring-0" : "size-[58px] text-[15px] ring-0"} />
          </div>

          <div className={isMobile ? "mt-6 text-[clamp(2.2rem,8vw,3.5rem)] font-medium tracking-tight text-foreground" : "mt-4 max-w-[24rem] text-[1.55rem] font-medium leading-[1.08] tracking-tight text-foreground"}>
            {borrowTitle}
          </div>
          <p className="mt-3 text-[15px] text-muted-foreground">{collateralSubtitle}</p>
        </div>

        <div className="mt-8 space-y-5">
          <MobileConfirmRow label="Collateral" value={collateralAmount} />
          <MobileConfirmRow label="Health factor" value={healthFactor} tone="positive" />
          <MobileConfirmRow label="Borrow APY" value={borrowApr} tone="warning" />
          <MobileConfirmRow label="Pool APY" value={poolApy} />
        </div>

        <div className="mt-7">
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-muted-foreground">Borrow power used</span>
            <span className="font-medium text-foreground">{borrowPowerUsedPct.toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[hsl(var(--brand))]" style={{ width: `${borrowPowerUsedPct}%` }} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3 text-[11.5px] text-muted-foreground">
            <span>{borrowPowerUsedLabel} used</span>
            <span>{borrowPowerRemainingLabel} available</span>
          </div>
        </div>

      </div>

      <div className={isMobile ? "border-t border-border px-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-4" : "border-t border-border px-5 pb-6 pt-5"}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-foreground">Fees paid</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">Estimated transaction cost</div>
          </div>
          <div className="font-data text-[20px] font-medium tracking-tight text-foreground">{feePaid}</div>
        </div>
        <Button
          type="button"
          className="h-12 w-full rounded-[14px] bg-[hsl(var(--brand))] text-[15px] text-white hover:bg-[hsl(var(--brand))]/90"
          onClick={onContinue}
        >
          Borrow now
        </Button>

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
}

function MobileConfirmRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "positive" | "warning"
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[14px] font-medium text-muted-foreground">{label}</span>
      <span
        className={
          tone === "positive"
            ? "text-[15px] font-medium text-emerald-600"
            : tone === "warning"
              ? "text-[15px] font-medium text-amber-600"
              : "text-[15px] font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  )
}

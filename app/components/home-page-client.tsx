"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Settings } from "lucide-react"
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

  const flowConfig = useMemo(() => {
    if (!activeFlow) {
      return null
    }

    if (activeFlow.stage === "success" && activeFlow.success) {
        return {
          actionLabel: activeFlow.mode,
        amountLabel: activeFlow.success.amountLabel,
        title: activeFlow.success.title,
        subtitle: activeFlow.success.description,
        rows: activeFlow.success.rows,
        note: undefined,
      }
    }

    switch (activeFlow.mode) {
      case "borrow":
        return {
          actionLabel: "borrow",
          amountLabel: `${Number.parseFloat(borrowAmount || "0").toFixed(0)} ${borrowToken?.symbol ?? ""}`.trim(),
          title: "Borrow successful",
          subtitle: `Borrow against ${borrowPool.name}.`,
          rows: [
            { label: "Collateral", value: `${borrowPool.name} · ${formatCompactUsd(borrowPool.collateralUsd)}` },
            { label: "Borrow APR", value: `${borrowToken?.borrowApr.toFixed(1) ?? "0.0"}%`, tone: "warning" },
            { label: "Health factor", value: borrowPreview.healthFactorLabel, tone: borrowPreview.riskTone === "danger" ? "danger" : "positive" },
            { label: "Liquidation threshold", value: formatCompactUsd(borrowPool.liquidationUsd), tone: "warning" },
          ] as HomeSuccessRow[],
          note: borrowPreview.warningTitle ? "Borrow carefully." : "Approve wallet, then wait for confirmation.",
        }
      case "repay":
        return {
          actionLabel: "repayment",
          amountLabel: `${formatCompactUsd(Number.parseFloat(repayAmount || "0"))} USDC`,
          title: "Repayment successful",
          subtitle: `Repay debt on ${repayPool.name}.`,
          rows: [
            { label: "Current debt", value: `${formatCompactUsd(debts[repayPoolId] ?? 0)} USDC` },
            { label: "Remaining debt", value: repayPreview.remainingDebtLabel },
            { label: "Health factor", value: `${repayPreview.oldHealthFactorLabel} -> ${repayPreview.healthFactorAfterLabel}`, tone: "positive" },
            { label: "Interest saved / yr", value: formatCompactUsd(repayPreview.yearlyInterestSavedUsd), tone: "positive" },
          ] as HomeSuccessRow[],
          note: "Approve wallet, then wait for confirmation.",
        }
      case "claim":
        return {
          actionLabel: "claim",
          amountLabel: formatUsd(claimPreview.effectiveClaimUsd),
          title: "Claim successful",
          subtitle: "Claim accrued LP fees.",
          rows: [
            { label: "Positions selected", value: String(claimPreview.selectedPositionIds.length) },
            { label: "Total claimable", value: formatUsd(claimPreview.selectedTotalUsd) },
            { label: "Claim amount", value: formatUsd(claimPreview.effectiveClaimUsd), tone: "positive" },
          ] as HomeSuccessRow[],
          note: "Approve wallet, then wait for confirmation.",
        }
      case "remove":
        return {
          actionLabel: "removal",
          amountLabel: `${removePercent}%`,
          title: "Removal successful",
          subtitle: `Remove collateral from ${removePool.name}.`,
          rows: [
            { label: "Returned to wallet", value: formatCompactUsd(removePreview.removeUsd), tone: "positive" },
            { label: "Remaining collateral", value: formatCompactUsd(removePreview.afterCollateralUsd) },
            { label: "Health factor", value: removePreview.healthFactorAfterLabel, tone: removePreview.isUnsafe ? "danger" : "positive" },
            { label: "Safe max", value: `${removePreview.safePercent}%` },
          ] as HomeSuccessRow[],
          note: removePreview.isUnsafe ? "This removal would be unsafe." : "Approve wallet, then wait for confirmation.",
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
        <section className="flex min-h-[calc(100vh-64px)] items-start justify-center pt-[5vh] md:pt-[6vh]">
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
                    {showInlineFlow && flowConfig ? (
                      <TransactionFlowPanel
                        stage={activeFlowStage}
                        actionLabel={flowConfig.actionLabel}
                        amountLabel={flowConfig.amountLabel}
                        title={flowConfig.title}
                        subtitle={flowConfig.subtitle}
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
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
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
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
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
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
                        visual={flowVisual}
                        rows={flowConfig.rows}
                        note={flowConfig.note}
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
          className="w-[calc(100vw-1.5rem)] max-w-md overflow-hidden rounded-radius-md border border-border bg-surface-raised p-0 shadow-elev-3"
        >
          <DialogTitle className="sr-only">Transaction preview</DialogTitle>
          {showMobileFlow && flowConfig ? (
            <TransactionFlowPanel
              stage={activeFlowStage}
              actionLabel={flowConfig.actionLabel}
              amountLabel={flowConfig.amountLabel}
              title={flowConfig.title}
              subtitle={flowConfig.subtitle}
              visual={flowVisual}
              rows={flowConfig.rows}
              note={flowConfig.note}
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

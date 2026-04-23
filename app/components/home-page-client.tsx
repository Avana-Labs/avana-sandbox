"use client"

import { useMemo, useState } from "react"
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
} from "@/app/lib/home-sim"
import type { HomeChain, HomeHowItWorksStep } from "@/app/lib/home-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActionSuccessDialog } from "./home/action-success-dialog"
import { CompactBorrowCard } from "./home/borrow-card"
import { CompactClaimCard } from "./home/claim-card"
import { CompactRemoveCard } from "./home/remove-card"
import { CompactRepayCard } from "./home/repay-card"
import { HomePreviewPanel } from "./home/preview-panel"
import { PoolPickerDialog } from "./home/pool-picker-dialog"
import { TokenPickerDialog } from "./home/token-picker-dialog"
import type { HomeSuccessState, PoolDialogMode } from "./home/types"

type HomePageClientProps = {
  chains: HomeChain[]
  howItWorksSteps: HomeHowItWorksStep[]
  totalPools: number
  completedPools: number
  progressPercentage: number
  totalPoints: number
}

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

// TODO(wallet): replace fake APRs with on-chain market APRs indexed by pool id
const REPAY_APR_BY_POOL_ID: Record<string, number> = {
  "eth-usdc": 5.2,
  "usdc-usdt": 3.9,
  "wbtc-eth": 0,
}

export function HomePageClient(_props: HomePageClientProps) {
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

  const showSidePanel =
    (mode === "borrow" && (Number.parseFloat(borrowAmount) || 0) > 0) ||
    (mode === "repay" && (Number.parseFloat(repayAmount) || 0) > 0) ||
    (mode === "remove" && removePercent > 0)

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex min-h-[calc(100vh-64px)] items-start justify-center pt-[5vh] md:pt-[6vh]">
          <div className="flex w-full items-start justify-center gap-4">
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

                <div className="relative mt-2 min-h-[320px]">
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

            <AnimatePresence initial={false}>
              {showSidePanel ? (
                <motion.aside
                  key="home-side-panel"
                  initial={{ opacity: 0, x: -12, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 320 }}
                  exit={{ opacity: 0, x: -12, width: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  className="hidden shrink-0 overflow-hidden pt-[52px] md:block"
                >
                  <div className="w-[320px] pr-2">
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

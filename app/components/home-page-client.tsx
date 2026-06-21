"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { getBorrowSessionWalletId } from "@/app/lib/borrow-system/demo-session"
import {
  buildHomeBorrowPreview,
  buildHomeClaimPreview,
  buildHomeRemovePreview,
  buildHomeRepayPreview,
  selectHomeBorrowTokensForMarket,
  selectHomeDebtContextForMarket,
  selectHomeDebtMap,
  selectRewardClaimableTotals,
} from "@/app/lib/borrow-system/home-runtime"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import {
  HOME_CLAIM_POSITIONS,
  HOME_DEFAULT_SELECTIONS,
  HOME_INITIAL_CLAIM_SELECTIONS,
  formatCompactUsd,
  type HomeMode,
} from "@/app/lib/home-sim"
import { CompactClaimCard } from "./home/claim-card"
import { CompactRemoveCard } from "./home/remove-card"
import { CompactRepayCard } from "./home/repay-card"
import { HomePreviewPanel } from "./home/preview-panel"
import { PoolPickerDialog } from "./home/pool-picker-dialog"
import { TokenPickerDialog } from "./home/token-picker-dialog"
import type { PoolDialogMode } from "./home/types"
import { HomeBorrowPanel } from "./home-borrow-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

export function HomePageClient() {
  const router = useRouter()
  const walletId = getBorrowSessionWalletId()
  const { borrow: session } = useAvanaSessions()
  const defaultBorrowPoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.borrowPoolId] ?? session.collateralPools[0]?.id ?? ""
  const defaultRepayPoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.repayPoolId] ?? session.collateralPools[0]?.id ?? ""
  const defaultRemovePoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.removePoolId] ?? session.collateralPools[0]?.id ?? ""

  // TODO(wallet): when wallet is connected, hydrate these from the user's
  // actual LP positions + debt balances instead of HOME_DEFAULT_SELECTIONS /
  // HOME_INITIAL_* fixtures. Shape should stay the same so the cards below
  // don't need to change.
  const [mode, setMode] = useState<HomeMode>("borrow")
  const [borrowPoolId, setBorrowPoolId] = useState(defaultBorrowPoolId)
  const [borrowTokenId, setBorrowTokenId] = useState<string | null>(null)
  const [borrowAmount, setBorrowAmount] = useState("")
  const [repayPoolId, setRepayPoolId] = useState(defaultRepayPoolId)
  const [repayAmount, setRepayAmount] = useState("")
  const [claimSelections, setClaimSelections] = useState(() => ({ ...HOME_INITIAL_CLAIM_SELECTIONS }))
  const [claimAmount, setClaimAmount] = useState("")
  const [removePoolId, setRemovePoolId] = useState(defaultRemovePoolId)
  const [removePercent, setRemovePercent] = useState(HOME_DEFAULT_SELECTIONS.removePercent)
  const [poolDialogMode, setPoolDialogMode] = useState<PoolDialogMode | null>(null)
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)

  const debts = useMemo(() => selectHomeDebtMap(session.state, walletId), [session.state, walletId])
  const borrowPool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === borrowPoolId) ?? session.collateralPools[0] ?? null,
    [borrowPoolId, session.collateralPools],
  )
  const borrowTokens = useMemo(
    () => (borrowPoolId ? selectHomeBorrowTokensForMarket(session.state, walletId, borrowPoolId) : []),
    [borrowPoolId, session.state, walletId],
  )
  const borrowToken = useMemo(
    () => (borrowTokenId ? borrowTokens.find((token) => token.id === borrowTokenId) ?? null : null),
    [borrowTokenId, borrowTokens],
  )
  const borrowPreview = useMemo(() => {
    if (!borrowPool) {
      return {
        amountUsd: 0,
        amountLabel: "—",
        isEmpty: true,
        isValid: false,
        exceedsBorrowPower: false,
        healthFactor: null,
        healthFactorLabel: "—",
        riskTone: "neutral" as const,
        progressPercent: 5,
        remainingBorrowPowerUsd: 0,
        warningTitle: null,
        warningMessage: null,
        ctaLabel: "Select collateral",
      }
    }
    return buildHomeBorrowPreview(
      session.state,
      walletId,
      borrowPool.id,
      borrowTokenId,
      Number.parseFloat(borrowAmount) || 0,
    )
  }, [borrowAmount, borrowPool, borrowTokenId, defaultBorrowPoolId, session.state, walletId])

  const repayPool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === repayPoolId) ?? session.collateralPools[0] ?? null,
    [repayPoolId, session.collateralPools],
  )
  const repayDebtContext = useMemo(
    () => (repayPoolId ? selectHomeDebtContextForMarket(session.state, walletId, repayPoolId) : null),
    [repayPoolId, session.state, walletId],
  )
  const repayToken = repayDebtContext?.token ?? null
  const repayPreview = useMemo(
    () => buildHomeRepayPreview(session.state, walletId, repayDebtContext?.position.id ?? null, Number.parseFloat(repayAmount) || 0),
    [repayAmount, repayDebtContext?.position.id, session.state, walletId],
  )

  const claimableTotals = useMemo(() => selectRewardClaimableTotals(session.state, walletId), [session.state, walletId])
  const claimPreview = useMemo(
    () => buildHomeClaimPreview(session.state, walletId, HOME_CLAIM_POSITIONS, claimSelections, Number.parseFloat(claimAmount) || null),
    [claimAmount, claimSelections, session.state, walletId],
  )

  const removePool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === removePoolId) ?? session.collateralPools[0] ?? null,
    [removePoolId, session.collateralPools],
  )
  const removePreview = useMemo(
    () => buildHomeRemovePreview(session.state, walletId, removePoolId, removePercent),
    [removePercent, removePoolId, session.state, walletId],
  )

  const navigateToBorrowAction = useCallback(() => {
    if (!borrowPool || !borrowToken) return
    router.push(
      actionPagePath("borrow", "borrow", {
        market: borrowPool.id,
        asset: borrowToken.id,
        amount: borrowAmount || "0",
      }),
    )
  }, [borrowAmount, borrowPool, borrowToken, router])

  const navigateToRepayAction = useCallback(() => {
    router.push(
      actionPagePath("borrow", "repay", {
        market: repayPoolId,
        amount: repayAmount || "0",
      }),
    )
  }, [repayAmount, repayPoolId, router])

  const navigateToClaimAction = useCallback(() => {
    router.push(
      actionPagePath("borrow", "claim", {
        amount: claimAmount || String(claimPreview.effectiveClaimUsd),
      }),
    )
  }, [claimAmount, claimPreview.effectiveClaimUsd, router])

  const navigateToRemoveAction = useCallback(() => {
    router.push(
      actionPagePath("borrow", "remove", {
        market: removePoolId,
        amount: String(removePercent),
      }),
    )
  }, [removePercent, removePoolId, router])

  useEffect(() => {
    if (!session.collateralPools.length) return
    if (!session.collateralPools.some((pool) => pool.id === borrowPoolId)) {
      setBorrowPoolId(defaultBorrowPoolId)
    }
    if (!session.collateralPools.some((pool) => pool.id === repayPoolId)) {
      setRepayPoolId(defaultRepayPoolId)
    }
    if (!session.collateralPools.some((pool) => pool.id === removePoolId)) {
      setRemovePoolId(defaultRemovePoolId)
    }
  }, [
    borrowPoolId,
    defaultBorrowPoolId,
    defaultRemovePoolId,
    defaultRepayPoolId,
    removePoolId,
    repayPoolId,
    session.collateralPools,
  ])

  useEffect(() => {
    if (!borrowTokens.length) {
      setBorrowTokenId(null)
      return
    }
    if (borrowTokenId && borrowTokens.some((token) => token.id === borrowTokenId)) {
      return
    }
    const preferredToken =
      borrowTokens.find((token) => token.symbol.toLowerCase() === HOME_DEFAULT_SELECTIONS.borrowTokenId) ?? borrowTokens[0]
    setBorrowTokenId(preferredToken?.id ?? null)
  }, [borrowTokenId, borrowTokens])

  useEffect(() => {
    if (!repayPool || (debts[repayPool.id] ?? 0) > 0) return
    const nextPoolWithDebt = session.collateralPools.find((pool) => (debts[pool.id] ?? 0) > 0)
    if (nextPoolWithDebt) {
      setRepayPoolId(nextPoolWithDebt.id)
    }
  }, [debts, repayPool, session.collateralPools])

  const handlePoolSelect = (poolId: string) => {
    if (poolDialogMode === "borrow") {
      setBorrowPoolId(poolId)
    }

    if (poolDialogMode === "repay") {
      if ((debts[poolId] ?? 0) <= 0) {
        const selectedPool = session.collateralPools.find((pool) => pool.id === poolId)
        toast.warning(`No debt on ${selectedPool?.name ?? "this position"}`)
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

  const showSidePanel =
    (mode === "borrow" && (Number.parseFloat(borrowAmount) || 0) > 0) ||
    (mode === "repay" && (Number.parseFloat(repayAmount) || 0) > 0) ||
    (mode === "remove" && removePercent > 0)

  if (!borrowPool || !repayPool || !removePool) {
    return null
  }

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex items-start justify-center py-4 md:py-6">
          <div className="flex w-full items-stretch justify-center gap-4">
            <div className="w-full max-w-[420px] self-stretch md:max-w-[460px]">
              <Tabs
                value={mode}
                onValueChange={(value) => setMode(value as HomeMode)}
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
                    <HomeBorrowPanel
                      pool={borrowPool}
                      token={borrowToken}
                      amount={borrowAmount}
                      preview={borrowPreview}
                      submitLabel="Review borrow"
                      onAmountChange={setBorrowAmount}
                      onOpenPoolSheet={() => setPoolDialogMode("borrow")}
                      onOpenTokenSheet={() => setTokenDialogOpen(true)}
                      onSubmit={navigateToBorrowAction}
                    />
                  </TabsContent>

                  <TabsContent value="repay" className="mt-0">
                    <CompactRepayCard
                      pool={repayPool}
                      token={repayToken}
                      debtUsd={debts[repayPoolId] ?? 0}
                      amount={repayAmount}
                      preview={repayPreview}
                      submitLabel="Review repayment"
                      onOpenPoolDialog={() => setPoolDialogMode("repay")}
                      onAmountChange={setRepayAmount}
                      onSetMax={() => setRepayAmount(String(repayDebtContext?.amountUsd ?? 0))}
                      onSubmit={navigateToRepayAction}
                    />
                  </TabsContent>

                  <TabsContent value="claim" className="mt-0">
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
                      onSubmit={navigateToClaimAction}
                    />
                  </TabsContent>

                  <TabsContent value="remove" className="mt-0">
                    <CompactRemoveCard
                      pool={removePool}
                      percent={removePercent}
                      preview={removePreview}
                      submitLabel="Review removal"
                      onOpenPoolDialog={() => setPoolDialogMode("remove")}
                      onPercentChange={setRemovePercent}
                      onSubmit={navigateToRemoveAction}
                    />
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
        pools={session.collateralPools}
        debts={debts}
      />
      <TokenPickerDialog
        open={tokenDialogOpen}
        onOpenChange={setTokenDialogOpen}
        selectedTokenId={borrowTokenId}
        tokens={borrowTokens}
        onSelect={(tokenId) => {
          setBorrowTokenId(tokenId)
          setTokenDialogOpen(false)
        }}
      />
    </div>
  )
}


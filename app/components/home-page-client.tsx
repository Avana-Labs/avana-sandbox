"use client"

import { useEffect, useMemo, useState } from "react"
import { Settings } from "lucide-react"
import { toast } from "sonner"
import { getBorrowSessionWalletId } from "@/app/lib/borrow-system/demo-session"
import { selectHomeBorrowTokensForMarket, selectHomeDebtMap } from "@/app/lib/borrow-system/home-runtime"
import { HOME_POOL_TO_MARKET_ID } from "@/app/lib/borrow-system/mock"
import { useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"
import { HOME_DEFAULT_SELECTIONS, type HomeMode } from "@/app/lib/home-sim"
import { ActionPageLaunchCta } from "@/app/components/action-page/action-page-launch-cta"
import { HomeActionContextBar } from "@/app/components/home/home-action-context-bar"
import { PoolPickerDialog } from "./home/pool-picker-dialog"
import { TokenPickerDialog } from "./home/token-picker-dialog"
import type { PoolDialogMode } from "./home/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const HOME_MODE_ITEMS: Array<{ value: HomeMode; label: string }> = [
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
  { value: "claim", label: "Claim" },
  { value: "remove", label: "Remove" },
]

export function HomePageClient() {
  const walletId = getBorrowSessionWalletId()
  const { borrow: session } = useAvanaSessions()
  const defaultBorrowPoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.borrowPoolId] ?? session.collateralPools[0]?.id ?? ""
  const defaultRepayPoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.repayPoolId] ?? session.collateralPools[0]?.id ?? ""
  const defaultRemovePoolId = HOME_POOL_TO_MARKET_ID[HOME_DEFAULT_SELECTIONS.removePoolId] ?? session.collateralPools[0]?.id ?? ""

  const [mode, setMode] = useState<HomeMode>("borrow")
  const [borrowPoolId, setBorrowPoolId] = useState(defaultBorrowPoolId)
  const [borrowTokenId, setBorrowTokenId] = useState<string | null>(null)
  const [repayPoolId, setRepayPoolId] = useState(defaultRepayPoolId)
  const [removePoolId, setRemovePoolId] = useState(defaultRemovePoolId)
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
  const repayPool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === repayPoolId) ?? session.collateralPools[0] ?? null,
    [repayPoolId, session.collateralPools],
  )
  const removePool = useMemo(
    () => session.collateralPools.find((pool) => pool.id === removePoolId) ?? session.collateralPools[0] ?? null,
    [removePoolId, session.collateralPools],
  )

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
    }

    if (poolDialogMode === "remove") {
      setRemovePoolId(poolId)
    }

    setPoolDialogMode(null)
  }

  if (!borrowPool || !repayPool || !removePool) {
    return null
  }

  return (
    <div className="bg-background">
      <main className="px-4">
        <section className="flex items-start justify-center py-4 md:py-6">
          <div className="w-full max-w-[560px]">
            <Tabs value={mode} onValueChange={(value) => setMode(value as HomeMode)} className="w-full">
              <div className="mb-4 flex items-center justify-between">
                <TabsList className="w-full justify-start">
                  {HOME_MODE_ITEMS.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="text-[14px] font-normal"
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

              <TabsContent value="borrow" className="mt-0 space-y-4">
                <HomeActionContextBar
                  pool={borrowPool}
                  token={borrowToken}
                  onOpenPool={() => setPoolDialogMode("borrow")}
                  onOpenToken={() => setTokenDialogOpen(true)}
                />
                <ActionPageLaunchCta
                  product="borrow"
                  kind="borrow"
                  market={borrowPoolId}
                  asset={borrowTokenId ?? undefined}
                  returnTo="/"
                  label="Continue to borrow"
                />
              </TabsContent>

              <TabsContent value="repay" className="mt-0 space-y-4">
                <HomeActionContextBar pool={repayPool} showToken={false} onOpenPool={() => setPoolDialogMode("repay")} />
                <ActionPageLaunchCta product="borrow" kind="repay" market={repayPoolId} returnTo="/" label="Continue to repay" />
              </TabsContent>

              <TabsContent value="claim" className="mt-0">
                <ActionPageLaunchCta product="borrow" kind="claim" returnTo="/" label="Continue to claim" />
              </TabsContent>

              <TabsContent value="remove" className="mt-0 space-y-4">
                <HomeActionContextBar pool={removePool} showToken={false} onOpenPool={() => setPoolDialogMode("remove")} />
                <ActionPageLaunchCta
                  product="borrow"
                  kind="remove"
                  market={removePoolId}
                  amount="25"
                  returnTo="/"
                  label="Continue to withdraw"
                />
              </TabsContent>
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

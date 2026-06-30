"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { hasConvexClient, useMarketLiquidity } from "@/app/lib/convex/market-liquidity-provider"
import type { ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { LendConvexSnapshot } from "@/app/lib/lend-system/market-hydration"
import type { MultiplyConvexSnapshot } from "@/app/lib/multiply-system/market-hydration"
import { useRewardsSession } from "@/app/lib/rewards-system"
import {
  borrowResultToRecordArgs,
  lendResultToRecordArgs,
  multiplyResultToRecordArgs,
} from "@/app/lib/sandbox-tx/persistence"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult, LendTransactionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult, MultiplyTransactionResult } from "@/app/lib/multiply-system/contracts"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { useAvanaSession } from "./use-avana-session"

type BorrowSession = ReturnType<typeof useBorrowSession>
type MultiplySession = ReturnType<typeof useMultiplySession>
type LendSession = ReturnType<typeof useLendSession>
type RewardsSession = ReturnType<typeof useRewardsSession>

function usd6ToNumber(value: bigint) {
  return Number(value) / 1_000_000
}

function useRewardsEventBridge({
  walletId,
  borrow,
  multiply,
  lend,
  rewards,
}: {
  walletId: string
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
  rewards: RewardsSession
}) {
  const seenIdsRef = useRef(new Set<string>())

  useEffect(() => {
    for (const item of borrow.transactionHistory) {
      const bridgeId = `borrow:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      if (item.kind === "borrow") {
        void rewards.recordActivityEvent({
          id: bridgeId,
          wallet: walletId,
          product: "borrow",
          type: "borrow_opened",
          amountUsd: usd6ToNumber(item.executedAmountUsd6),
          marketId: item.marketId,
          timestamp: item.timestamp,
        })
      }

      if (item.kind === "repay") {
        void rewards.recordActivityEvent({
          id: bridgeId,
          wallet: walletId,
          product: "borrow",
          type: "borrow_repaid",
          amountUsd: usd6ToNumber(item.executedAmountUsd6),
          marketId: item.marketId,
          timestamp: item.timestamp,
        })
      }
    }
  }, [borrow.transactionHistory, rewards, walletId])

  useEffect(() => {
    for (const item of multiply.transactionHistory) {
      const bridgeId = `multiply:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      void rewards.recordActivityEvent({
        id: bridgeId,
        wallet: walletId,
        product: "multiply",
        type: item.kind === "multiply" ? "multiply_opened" : "multiply_deleveraged",
        amountUsd: item.amountUsd,
        marketId: item.marketId,
        timestamp: item.timestamp,
      })
    }
  }, [multiply.transactionHistory, rewards, walletId])

  useEffect(() => {
    for (const item of lend.transactionHistory) {
      const bridgeId = `lend:${item.id}`
      if (item.status !== "success" || seenIdsRef.current.has(bridgeId)) continue
      seenIdsRef.current.add(bridgeId)

      if (item.kind === "claim") continue

      void rewards.recordActivityEvent({
        id: bridgeId,
        wallet: walletId,
        product: "lend",
        type: item.kind === "deposit" ? "lend_deposited" : "lend_withdrawn",
        marketId: item.marketId,
        amountUsd: item.amount,
        timestamp: item.timestamp,
      })
    }
  }, [lend.transactionHistory, rewards, walletId])
}

/**
 * Fold every NEW successful borrow-system action into the shared multi-user
 * liquidity ledger (Convex). Existing/persisted history is snapshotted as
 * already-seen on mount so it isn't re-imported on every page load — the ledger
 * only accumulates genuine session actions, across all users, over time.
 */
function useLiquidityLedgerBridge({ borrow, enabled }: { borrow: BorrowSession; enabled: boolean }) {
  const { recordDelta } = useMarketLiquidity()
  const seenIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(borrow.transactionHistory.map((item) => item.id))
      return
    }

    for (const item of borrow.transactionHistory) {
      if (item.status !== "success" || seenIdsRef.current.has(item.id)) continue
      seenIdsRef.current.add(item.id)

      const amountUsd = usd6ToNumber(item.executedAmountUsd6)
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) continue

      if (item.kind === "borrow" && item.assetId) {
        recordDelta({ marketSlug: item.assetId, borrowedDeltaUsd: amountUsd })
      } else if (item.kind === "repay" && item.assetId) {
        recordDelta({ marketSlug: item.assetId, borrowedDeltaUsd: -amountUsd })
      } else if (item.kind === "deposit" && item.marketId) {
        recordDelta({ marketSlug: item.marketId, suppliedDeltaUsd: amountUsd })
      } else if (item.kind === "withdraw" && item.marketId) {
        recordDelta({ marketSlug: item.marketId, suppliedDeltaUsd: -amountUsd })
      }
    }
  }, [borrow.transactionHistory, enabled, recordDelta])
}

/**
 * Pushes the Convex market reference data (listMarketSnapshots) into the borrow
 * AND lend sessions so list/preview/HF/hero read the single source of truth. One
 * query feeds both — it returns every scope (asset/pool/lend) and each session
 * picks its own rows. Rendered only when a Convex client exists (so useQuery has a
 * ConvexProvider). No-op while loading.
 */
function MarketHydrator({
  hydrateBorrow,
  hydrateLend,
  hydrateMultiply,
}: {
  hydrateBorrow: (snapshots: readonly ConvexMarketSnapshot[]) => void
  hydrateLend: (snapshots: readonly LendConvexSnapshot[]) => void
  hydrateMultiply: (snapshots: readonly MultiplyConvexSnapshot[]) => void
}) {
  const snapshots = useQuery(api.markets.listMarketSnapshots)
  useEffect(() => {
    if (snapshots && snapshots.length > 0) {
      hydrateBorrow(snapshots as ConvexMarketSnapshot[])
      hydrateLend(snapshots)
      hydrateMultiply(snapshots)
    }
  }, [snapshots, hydrateBorrow, hydrateLend, hydrateMultiply])
  return null
}

function WalletHydrator({
  walletId,
  hydrateBorrow,
  hydrateLend,
  hydrateMultiply,
}: {
  walletId: string
  hydrateBorrow: BorrowSession["hydrateWalletData"]
  hydrateLend: LendSession["hydrateWalletData"]
  hydrateMultiply: MultiplySession["hydrateWalletData"]
}) {
  const session = useQuery(api.sandbox.transactions.getSessionState, { wallet: walletId })
  useEffect(() => {
    if (!session) return
    hydrateBorrow(session)
    hydrateLend(session)
    hydrateMultiply(session)
  }, [hydrateBorrow, hydrateLend, hydrateMultiply, session])
  return null
}

export type AvanaSessions = {
  walletId: string
  walletAddress: string
  sandboxMode: true
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
  rewards: RewardsSession
}

const AvanaSessionsContext = createContext<AvanaSessions | null>(null)

export function AvanaSessionsProvider({
  walletId,
  children,
  persistBorrowTransaction,
  persistLendTransaction,
  persistMultiplyTransaction,
  remoteRewardsState,
  persistRewardsState,
  persistLocalState = true,
  sessionSource = "demo",
}: {
  walletId?: string
  children: ReactNode
  persistBorrowTransaction?: (result: SandboxActionResult) => Promise<{
    id: string
    hash: string
    status: "success" | "failed" | "pending"
    simulated: boolean
    timestamp: number
  }>
  persistLendTransaction?: (result: LendSandboxActionResult) => Promise<LendTransactionResult>
  persistMultiplyTransaction?: (result: MultiplySandboxActionResult) => Promise<MultiplyTransactionResult>
  remoteRewardsState?: string | null
  persistRewardsState?: (stateJson: string) => Promise<unknown>
  persistLocalState?: boolean
  sessionSource?: "demo" | "convex"
}) {
  const avana = useAvanaSession(walletId, sessionSource)
  const borrow = useBorrowSession({
    walletId: avana.walletId,
    sessionSeed: avana.borrowSessionSeed,
    persistState: persistLocalState,
    persistTransaction: persistBorrowTransaction,
  })
  const multiply = useMultiplySession({
    walletId: avana.walletId,
    sessionSeed: avana.multiplySessionSeed,
    persistState: persistLocalState,
    persistTransaction: persistMultiplyTransaction,
  })
  const lend = useLendSession({
    walletId: avana.walletId,
    sessionSeed: avana.lendSessionSeed,
    persistState: persistLocalState,
    persistTransaction: persistLendTransaction,
  })
  const rewards = useRewardsSession({
    walletId: avana.walletId,
    sessionSeed: avana.rewardsSessionSeed,
    persistState: persistLocalState,
    remoteState: remoteRewardsState,
    persistRemoteState: persistRewardsState,
  })

  useRewardsEventBridge({
    walletId: avana.walletId,
    borrow,
    multiply,
    lend,
    rewards,
  })

  useLiquidityLedgerBridge({ borrow, enabled: persistLocalState })

  const value = useMemo<AvanaSessions>(
    () => ({
      walletId: avana.walletId,
      walletAddress: avana.walletAddress,
      sandboxMode: avana.sandboxMode,
      borrow,
      multiply,
      lend,
      rewards,
    }),
    [avana.walletId, avana.walletAddress, avana.sandboxMode, borrow, multiply, lend, rewards],
  )

  return (
    <AvanaSessionsContext.Provider value={value}>
      {hasConvexClient ? (
        <>
          <MarketHydrator
            hydrateBorrow={borrow.hydrateMarketData}
            hydrateLend={lend.hydrateMarketData}
            hydrateMultiply={multiply.hydrateMarketData}
          />
          {!persistLocalState ? (
            <WalletHydrator
              walletId={avana.walletId}
              hydrateBorrow={borrow.hydrateWalletData}
              hydrateLend={lend.hydrateWalletData}
              hydrateMultiply={multiply.hydrateWalletData}
            />
          ) : null}
        </>
      ) : null}
      {children}
    </AvanaSessionsContext.Provider>
  )
}

export function ConvexAvanaSessionsProvider({
  walletId,
  children,
}: {
  walletId: string
  children: ReactNode
}) {
  const recordTransaction = useMutation(api.sandbox.transactions.recordTransaction)
  const saveRewardsState = useMutation(api.sandbox.rewards.saveState)
  const rewardsState = useQuery(api.sandbox.rewards.getState, { wallet: walletId })
  const persistBorrowTransaction = useCallback(
    async (result: SandboxActionResult) => {
      const persisted = await recordTransaction(borrowResultToRecordArgs(result, walletId))
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistLendTransaction = useCallback(
    async (result: LendSandboxActionResult): Promise<LendTransactionResult> => {
      const persisted = await recordTransaction(lendResultToRecordArgs(result, walletId))
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistMultiplyTransaction = useCallback(
    async (result: MultiplySandboxActionResult): Promise<MultiplyTransactionResult> => {
      const persisted = await recordTransaction(multiplyResultToRecordArgs(result, walletId))
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, walletId],
  )
  const persistRewardsState = useCallback(
    (stateJson: string) => saveRewardsState({ wallet: walletId, stateJson }),
    [saveRewardsState, walletId],
  )

  return (
    <AvanaSessionsProvider
      walletId={walletId}
      persistBorrowTransaction={persistBorrowTransaction}
      persistLendTransaction={persistLendTransaction}
      persistMultiplyTransaction={persistMultiplyTransaction}
      remoteRewardsState={rewardsState?.stateJson ?? (rewardsState === null ? null : undefined)}
      persistRewardsState={persistRewardsState}
      persistLocalState={false}
      sessionSource="convex"
    >
      {children}
    </AvanaSessionsProvider>
  )
}

export function useAvanaSessions() {
  const context = useContext(AvanaSessionsContext)
  if (!context) {
    throw new Error("useAvanaSessions must be used within AvanaSessionsProvider")
  }
  return context
}

export function useOptionalAvanaSessions() {
  return useContext(AvanaSessionsContext)
}

export function useBorrowSessionContext() {
  return useAvanaSessions().borrow
}

export function useMultiplySessionContext() {
  return useAvanaSessions().multiply
}

export function useLendSessionContext() {
  return useAvanaSessions().lend
}

export function useRewardsSessionContext() {
  return useAvanaSessions().rewards
}

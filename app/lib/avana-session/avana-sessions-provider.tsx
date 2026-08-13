"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react"
import { useMarketLiquidity } from "@/app/lib/convex/market-liquidity-provider"
import { useRewardsSession } from "@/app/lib/rewards-system"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult, LendTransactionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult, MultiplyTransactionResult } from "@/app/lib/multiply-system/contracts"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { useSwapSession, type DurableSwapTransaction } from "@/app/lib/swap-system/use-swap-session"
import type { SwapTransactionRecord } from "@/app/lib/swap-system/transaction-adapter"
import { useAvanaSession } from "./use-avana-session"

type BorrowSession = ReturnType<typeof useBorrowSession>
type MultiplySession = ReturnType<typeof useMultiplySession>
type LendSession = ReturnType<typeof useLendSession>
type RewardsSession = ReturnType<typeof useRewardsSession>
type SwapSession = ReturnType<typeof useSwapSession>

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
      // History is prepended newest-first, so the first already-bridged id means every older
      // item was bridged in a prior run — stop instead of scanning the whole array each change.
      if (seenIdsRef.current.has(bridgeId)) break
      if (item.status !== "success") continue
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
      if (seenIdsRef.current.has(bridgeId)) break // newest-first: older items already bridged
      if (item.status !== "success") continue
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
      if (seenIdsRef.current.has(bridgeId)) break // newest-first: older items already bridged
      if (item.status !== "success") continue
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
 * Fold every NEW successful borrow-system action into the LOCAL in-session liquidity
 * ledger (the demo fallback used when the shared Convex ledger is unreachable). Existing/
 * persisted history is snapshotted as already-seen on mount so it isn't re-imported on
 * every page load.
 *
 * When the shared Convex ledger IS connected, this bridge stays out of the way: the
 * shared ledger is written server-side inside the idempotent recordTransaction (keyed by
 * intent), so folding here as well would double-count a single action (H20). The client
 * `recordDelta` is a no-op in connected mode, but we also skip early so the demo bridge
 * can never contribute to the shared cross-user numbers.
 */
function useLiquidityLedgerBridge({ borrow, enabled }: { borrow: BorrowSession; enabled: boolean }) {
  const { recordDelta, connected } = useMarketLiquidity()
  const seenIdsRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!enabled || connected) return
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
  }, [borrow.transactionHistory, enabled, connected, recordDelta])
}

export type AvanaSessions = {
  walletId: string
  walletAddress: string
  sandboxMode: true
  borrow: BorrowSession
  multiply: MultiplySession
  lend: LendSession
  rewards: RewardsSession
  swap: SwapSession
}

export type AvanaIdentity = Pick<AvanaSessions, "walletId" | "walletAddress" | "sandboxMode">

const AvanaSessionsContext = createContext<AvanaSessions | null>(null)
const AvanaIdentityContext = createContext<AvanaIdentity | null>(null)
const BorrowSessionContext = createContext<BorrowSession | null>(null)
const MultiplySessionContext = createContext<MultiplySession | null>(null)
const LendSessionContext = createContext<LendSession | null>(null)
const RewardsSessionContext = createContext<RewardsSession | null>(null)
const SwapSessionContext = createContext<SwapSession | null>(null)

export function AvanaSessionsProvider({
  walletId,
  children,
  persistBorrowTransaction,
  persistLendTransaction,
  persistMultiplyTransaction,
  persistSwapTransaction,
  remoteSwapTransactions,
  remoteRewardsState,
  remoteRewardsRevision,
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
  persistSwapTransaction?: (record: SwapTransactionRecord) => void | Promise<unknown>
  remoteSwapTransactions?: DurableSwapTransaction[]
  remoteRewardsState?: string | null
  remoteRewardsRevision?: number | null
  persistRewardsState?: (args: {
    stateJson: string
    expectedRevision?: number
  }) => Promise<{ revision?: number } | unknown>
  persistLocalState?: boolean
  sessionSource?: "demo" | "convex"
}) {
  const { deltas: liquidityDeltas } = useMarketLiquidity()
  const liquidityDeltasRef = useRef(liquidityDeltas)
  liquidityDeltasRef.current = liquidityDeltas
  const getLiquidityDeltas = useCallback(() => liquidityDeltasRef.current, [])

  const avana = useAvanaSession(walletId, sessionSource)
  const borrow = useBorrowSession({
    walletId: avana.walletId,
    sessionSeed: avana.borrowSessionSeed,
    persistState: persistLocalState,
    persistTransaction: persistBorrowTransaction,
    getLiquidityDeltas,
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
    remoteRevision: remoteRewardsRevision,
    persistRemoteState: persistRewardsState,
  })
  const swap = useSwapSession({
    walletId: avana.walletId,
    persistState: persistLocalState,
    persistTransaction: persistSwapTransaction,
    remoteTransactions: remoteSwapTransactions,
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
      swap,
    }),
    [avana.walletId, avana.walletAddress, avana.sandboxMode, borrow, multiply, lend, rewards, swap],
  )
  const identity = useMemo<AvanaIdentity>(
    () => ({
      walletId: avana.walletId,
      walletAddress: avana.walletAddress,
      sandboxMode: avana.sandboxMode,
    }),
    [avana.walletId, avana.walletAddress, avana.sandboxMode],
  )

  return (
    <AvanaSessionsContext.Provider value={value}>
      <AvanaIdentityContext.Provider value={identity}>
        <BorrowSessionContext.Provider value={borrow}>
          <MultiplySessionContext.Provider value={multiply}>
            <LendSessionContext.Provider value={lend}>
              <RewardsSessionContext.Provider value={rewards}>
                <SwapSessionContext.Provider value={swap}>{children}</SwapSessionContext.Provider>
              </RewardsSessionContext.Provider>
            </LendSessionContext.Provider>
          </MultiplySessionContext.Provider>
        </BorrowSessionContext.Provider>
      </AvanaIdentityContext.Provider>
    </AvanaSessionsContext.Provider>
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

export function useAvanaIdentity() {
  const context = useContext(AvanaIdentityContext)
  if (!context) {
    throw new Error("useAvanaIdentity must be used within AvanaSessionsProvider")
  }
  return context
}

export function useBorrowSessionContext() {
  const context = useContext(BorrowSessionContext)
  if (!context) {
    throw new Error("useBorrowSessionContext must be used within AvanaSessionsProvider")
  }
  return context
}

/**
 * Returns the borrow session when mounted inside AvanaSessionsProvider, null otherwise.
 * Use in components that appear in BOTH session-scoped surfaces (dashboard, borrow) AND
 * chromed shells that may render without a session (e.g. the global search command
 * inside a test-only wrapper). Session-scoped consumers should keep useBorrowSessionContext.
 */
export function useBorrowSessionContextOptional() {
  return useContext(BorrowSessionContext)
}

export function useMultiplySessionContext() {
  const context = useContext(MultiplySessionContext)
  if (!context) {
    throw new Error("useMultiplySessionContext must be used within AvanaSessionsProvider")
  }
  return context
}

export function useLendSessionContext() {
  const context = useContext(LendSessionContext)
  if (!context) {
    throw new Error("useLendSessionContext must be used within AvanaSessionsProvider")
  }
  return context
}

export function useRewardsSessionContext() {
  const context = useContext(RewardsSessionContext)
  if (!context) {
    throw new Error("useRewardsSessionContext must be used within AvanaSessionsProvider")
  }
  return context
}

export function useSwapSessionContext() {
  const context = useContext(SwapSessionContext)
  if (!context) {
    throw new Error("useSwapSessionContext must be used within AvanaSessionsProvider")
  }
  return context
}

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
import { pendingHydrationIntentIds, shouldApplyHydration } from "./wallet-hydration-guard"
import {
  advanceRevisionOnSuccess,
  captureHydratedRevisions,
  seedRevisionFromReceipt,
  withExpectedRevision,
  type PositionRevisionSummary,
} from "./optimistic-revision"

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
  borrow,
  lend,
  multiply,
  hydrateBorrow,
  hydrateLend,
  hydrateMultiply,
  onWalletHydrated,
}: {
  walletId: string
  borrow: BorrowSession
  lend: LendSession
  multiply: MultiplySession
  hydrateBorrow: BorrowSession["hydrateWalletData"]
  hydrateLend: LendSession["hydrateWalletData"]
  hydrateMultiply: MultiplySession["hydrateWalletData"]
  /** Called with the position set of a snapshot that actually gets APPLIED, so the caller
   *  can track the revision the engine state is now based on (for optimistic concurrency). */
  onWalletHydrated?: (positions: readonly PositionRevisionSummary[]) => void
}) {
  const session = useQuery(api.sandbox.transactions.getSessionState, { wallet: walletId })

  // Hold the latest history arrays in a ref so the hydration effect reads current optimistic
  // edits without re-running on every local history change (it runs only on re-emit). Storing
  // references (O(1)/render) instead of an eagerly-built Set keeps unrelated re-renders cheap.
  const historiesRef = useRef({
    borrow: borrow.transactionHistory,
    lend: lend.transactionHistory,
    multiply: multiply.transactionHistory,
  })
  historiesRef.current = {
    borrow: borrow.transactionHistory,
    lend: lend.transactionHistory,
    multiply: multiply.transactionHistory,
  }

  useEffect(() => {
    if (!session) return
    // Gate on RECENT, non-failed optimistic intents only. Applying a re-emit that predates an
    // in-flight write would clobber it; but gating on EVERY known intent (incl. failed/rejected
    // ones the server never stored) permanently froze the hydrator. pendingHydrationIntentIds
    // drops failed + aged-out intents so a poison intent can't pin the tab on stale data.
    const { borrow: b, lend: l, multiply: m } = historiesRef.current
    const pending = pendingHydrationIntentIds([...b, ...l, ...m], Date.now())
    if (!shouldApplyHydration(session, pending)) return
    hydrateBorrow(session)
    hydrateLend(session)
    hydrateMultiply(session)
    // Track the revisions this applied snapshot is based on (optimistic-concurrency guard).
    onWalletHydrated?.(session.positions)
  }, [hydrateBorrow, hydrateLend, hydrateMultiply, onWalletHydrated, session])
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
const BorrowSessionContext = createContext<BorrowSession | null>(null)
const MultiplySessionContext = createContext<MultiplySession | null>(null)
const LendSessionContext = createContext<LendSession | null>(null)
const RewardsSessionContext = createContext<RewardsSession | null>(null)

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
  onWalletHydrated,
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
  /** Notified with the position set each time a Convex snapshot is applied to the engine
   *  state; used by the Convex provider to track revisions for optimistic concurrency. */
  onWalletHydrated?: (positions: readonly PositionRevisionSummary[]) => void
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
      <BorrowSessionContext.Provider value={borrow}>
        <MultiplySessionContext.Provider value={multiply}>
          <LendSessionContext.Provider value={lend}>
            <RewardsSessionContext.Provider value={rewards}>
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
                      borrow={borrow}
                      lend={lend}
                      multiply={multiply}
                      hydrateBorrow={borrow.hydrateWalletData}
                      hydrateLend={lend.hydrateWalletData}
                      hydrateMultiply={multiply.hydrateWalletData}
                      onWalletHydrated={onWalletHydrated}
                    />
                  ) : null}
                </>
              ) : null}
              {children}
            </RewardsSessionContext.Provider>
          </LendSessionContext.Provider>
        </MultiplySessionContext.Provider>
      </BorrowSessionContext.Provider>
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

  // Optimistic-concurrency: the revision each (product, market) position was last hydrated
  // to. Sent as expectedRevision so the server rejects a write computed from a stale read
  // (another tab wrote first) instead of silently clobbering it. See ./optimistic-revision.
  const revisionByKeyRef = useRef(new Map<string, number>())
  const handleWalletHydrated = useCallback(
    (positions: readonly PositionRevisionSummary[]) => captureHydratedRevisions(revisionByKeyRef.current, positions),
    [],
  )

  const persistBorrowTransaction = useCallback(
    async (result: SandboxActionResult) => {
      const { args, key } = withExpectedRevision(borrowResultToRecordArgs(result, walletId), "borrow", revisionByKeyRef.current)
      const persisted = await recordTransaction(args)
      // Seed from the server-authoritative revision (works for idempotent replays too, M-12);
      // fall back to the +1 inference only if the receipt carries no revision.
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
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
      const { args, key } = withExpectedRevision(lendResultToRecordArgs(result, walletId), "lend", revisionByKeyRef.current)
      const persisted = await recordTransaction(args)
      // Seed from the server-authoritative revision (works for idempotent replays too, M-12);
      // fall back to the +1 inference only if the receipt carries no revision.
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
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
      const { args, key } = withExpectedRevision(multiplyResultToRecordArgs(result, walletId), "multiply", revisionByKeyRef.current)
      const persisted = await recordTransaction(args)
      // Seed from the server-authoritative revision (works for idempotent replays too, M-12);
      // fall back to the +1 inference only if the receipt carries no revision.
      if (persisted.revision != null) seedRevisionFromReceipt(revisionByKeyRef.current, key, persisted.revision)
      else advanceRevisionOnSuccess(revisionByKeyRef.current, key, persisted.idempotent)
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
      onWalletHydrated={handleWalletHydrated}
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
  const context = useContext(BorrowSessionContext)
  if (!context) {
    throw new Error("useBorrowSessionContext must be used within AvanaSessionsProvider")
  }
  return context
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

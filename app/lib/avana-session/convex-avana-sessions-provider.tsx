"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { SwapQuote, SwapQuoteRequest } from "@/app/lib/swap-system/quote-provider"
import type { SandboxActionResult } from "@/app/lib/borrow-system/contracts"
import type { LendSandboxActionResult, LendTransactionResult } from "@/app/lib/lend-system/contracts"
import type { MultiplySandboxActionResult, MultiplyTransactionResult } from "@/app/lib/multiply-system/contracts"
import {
  borrowResultToRecordArgs,
  lendResultToRecordArgs,
  multiplyResultToRecordArgs,
  swapRecordToRecordSwapArgs,
} from "@/app/lib/sandbox-tx/persistence"
import type { SwapTransactionRecord } from "@/app/lib/swap-system/transaction-adapter"
import type { ConvexUmbrellaSessionState, PersistUmbrellaAction } from "@/app/lib/umbrella-system/use-umbrella-session"
import {
  AvanaSessionsProvider,
  useBorrowSessionContext,
  useLendSessionContext,
  useMultiplySessionContext,
  useSwapSessionContext,
} from "./avana-sessions-provider"
import { ConvexMarketSnapshotHydrators } from "./convex-market-snapshot-hydrators"
import { pendingHydrationIntentIds, shouldApplyHydration } from "./wallet-hydration-guard"
import {
  advanceRevisionOnSuccess,
  captureHydratedRevisions,
  seedRevisionFromReceipt,
  withExpectedRevision,
  type PositionRevisionSummary,
} from "./optimistic-revision"

type EnsureWalletFixture = (args: { wallet: string }) => Promise<unknown>

export function useEnsureWalletFixtures({
  walletId,
  ensurePortfolioSnapshot,
  ensureUmbrellaFixtures,
  retryDelayMs = 1_000,
  maxAttempts = 3,
}: {
  walletId: string
  ensurePortfolioSnapshot: EnsureWalletFixture
  ensureUmbrellaFixtures: EnsureWalletFixture
  retryDelayMs?: number
  maxAttempts?: number
}) {
  const ensuredWalletRef = useRef<string | null>(null)
  const attemptsByWalletRef = useRef(new Map<string, number>())
  const [ensureAttempt, setEnsureAttempt] = useState(0)

  useEffect(() => {
    if (ensuredWalletRef.current === walletId) return
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    ensuredWalletRef.current = walletId
    const attempt = (attemptsByWalletRef.current.get(walletId) ?? 0) + 1
    attemptsByWalletRef.current.set(walletId, attempt)
    void (async () => {
      try {
        await ensurePortfolioSnapshot({ wallet: walletId })
        await ensureUmbrellaFixtures({ wallet: walletId })
        attemptsByWalletRef.current.delete(walletId)
      } catch {
        if (cancelled || ensuredWalletRef.current !== walletId) return
        if (attempt >= maxAttempts) return
        ensuredWalletRef.current = null
        retryTimer = setTimeout(
          () => setEnsureAttempt((currentAttempt) => currentAttempt + 1),
          retryDelayMs * 2 ** (attempt - 1),
        )
      }
    })()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [ensureAttempt, ensurePortfolioSnapshot, ensureUmbrellaFixtures, maxAttempts, retryDelayMs, walletId])
}

export function useWalletHydrationScope(walletId: string) {
  const revisionScopeRef = useRef<{ walletId: string; revisions: Map<string, number> } | null>(null)
  if (revisionScopeRef.current?.walletId !== walletId) {
    revisionScopeRef.current = { walletId, revisions: new Map() }
  }
  const revisions = revisionScopeRef.current.revisions
  const [hydratedWalletId, setHydratedWalletId] = useState<string | null>(null)
  const handleWalletHydrated = useCallback(
    (positions: readonly PositionRevisionSummary[]) => {
      captureHydratedRevisions(revisions, positions)
      setHydratedWalletId(walletId)
    },
    [revisions, walletId],
  )

  return {
    revisions,
    walletHydrationPending: hydratedWalletId !== walletId,
    handleWalletHydrated,
  }
}

function ConvexWalletHydrators({
  walletId,
  onWalletHydrated,
}: {
  walletId: string
  onWalletHydrated: (positions: readonly PositionRevisionSummary[]) => void
}) {
  const borrow = useBorrowSessionContext()
  const lend = useLendSessionContext()
  const multiply = useMultiplySessionContext()
  const swap = useSwapSessionContext()
  const ensurePortfolioSnapshot = useMutation(api.sandbox.transactions.ensurePortfolioSnapshot)
  const ensureUmbrellaFixtures = useMutation(api.sandbox.umbrella.ensureTestWalletFixtures)
  const session = useQuery(api.sandbox.transactions.getSessionState, { wallet: walletId })
  const productBalances = useQuery(api.wallet.productBalances.listForWallet, { wallet: walletId })
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
  // Seed the wallet snapshot and the canonical test wallet's Umbrella fixtures.
  // Both mutations are idempotent, so retrying a partial/transient failure is safe.
  useEnsureWalletFixtures({ walletId, ensurePortfolioSnapshot, ensureUmbrellaFixtures })

  useEffect(() => {
    if (!session || productBalances === undefined) return
    const { borrow: borrowHistory, lend: lendHistory, multiply: multiplyHistory } = historiesRef.current
    const pending = pendingHydrationIntentIds([...borrowHistory, ...lendHistory, ...multiplyHistory], Date.now())
    if (!shouldApplyHydration(session, pending)) return
    type HydratablePosition = (typeof session.positions)[number] & { product: "borrow" | "lend" | "multiply" }
    type HydratableTransaction = (typeof session.transactions)[number] & {
      product: "borrow" | "lend" | "multiply" | "rewards" | "swap"
    }
    const productSession = {
      ...session,
      positions: session.positions.filter((position) => position.product !== "umbrella") as HydratablePosition[],
      transactions: session.transactions.filter(
        (transaction) => transaction.product !== "umbrella",
      ) as HydratableTransaction[],
    }
    borrow.hydrateWalletData({
      ...productSession,
      borrowBalances: productBalances?.borrow.map((row) => ({
        marketId: row.marketId,
        assetId: row.assetId,
        poolId: row.poolId,
        symbol: row.symbol,
        amount: row.amount,
        valueUsd: row.valueUsd,
        state: row.state,
      })),
    })
    lend.hydrateWalletData({
      ...productSession,
      lendBalances: productBalances?.lend.map((row) => ({
        marketId: row.marketId,
        assetId: row.assetId,
        symbol: row.symbol,
        amount: row.amount,
        valueUsd: row.valueUsd,
        state: row.state,
        updatedAt: row.updatedAt,
      })),
    })
    multiply.hydrateWalletData({
      ...productSession,
      multiplyBalances: productBalances?.multiply.map((row) => ({
        marketId: row.marketId,
        assetId: row.assetId,
        symbol: row.symbol,
        amount: row.amount,
        valueUsd: row.valueUsd,
        state: row.state,
      })),
    })
    onWalletHydrated(session.positions)
  }, [
    borrow.hydrateWalletData,
    lend.hydrateWalletData,
    multiply.hydrateWalletData,
    onWalletHydrated,
    session,
    productBalances,
  ])

  useEffect(() => {
    if (productBalances?.liquid && productBalances.liquid.length > 0) {
      swap.hydrateBalances(
        productBalances.liquid.map((row) => ({
          id: `${walletId}:${row.assetId}:liquid`,
          walletId,
          assetId: row.assetId,
          amount: row.amount,
          sourceType: "wallet" as const,
        })),
      )
      return
    }
    if (productBalances?.liquid) swap.hydrateBalances([])
  }, [productBalances?.liquid, swap.hydrateBalances, walletId])

  return null
}

export function ConvexAvanaSessionsProvider({ walletId, children }: { walletId: string; children: ReactNode }) {
  const recordTransaction = useMutation(api.sandbox.transactions.recordTransaction)
  const recordSwap = useMutation(api.sandbox.transactions.recordSwap)
  const durableSwapTransactions = useQuery(api.sandbox.transactions.getWalletSwapTransactions, { wallet: walletId })
  const saveRewardsState = useMutation(api.sandbox.rewards.saveState)
  const rewardsState = useQuery(api.sandbox.rewards.getState, { wallet: walletId })
  const umbrellaSessionState = useQuery(api.sandbox.umbrella.getSessionState, { wallet: walletId })
  const recordUmbrellaAction = useMutation(api.sandbox.umbrella.recordAction)
  const { revisions, walletHydrationPending, handleWalletHydrated } = useWalletHydrationScope(walletId)

  const persistBorrowTransaction = useCallback(
    async (result: SandboxActionResult) => {
      const { args, key } = withExpectedRevision(borrowResultToRecordArgs(result, walletId), "borrow", revisions)
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisions, key, persisted.revision)
      else advanceRevisionOnSuccess(revisions, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, revisions, walletId],
  )
  const persistLendTransaction = useCallback(
    async (result: LendSandboxActionResult): Promise<LendTransactionResult> => {
      const { args, key } = withExpectedRevision(lendResultToRecordArgs(result, walletId), "lend", revisions)
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisions, key, persisted.revision)
      else advanceRevisionOnSuccess(revisions, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, revisions, walletId],
  )
  const persistMultiplyTransaction = useCallback(
    async (result: MultiplySandboxActionResult): Promise<MultiplyTransactionResult> => {
      const { args, key } = withExpectedRevision(multiplyResultToRecordArgs(result, walletId), "multiply", revisions)
      const persisted = await recordTransaction(args)
      if (persisted.revision != null) seedRevisionFromReceipt(revisions, key, persisted.revision)
      else advanceRevisionOnSuccess(revisions, key, persisted.idempotent)
      return {
        id: String(persisted.receipt.id),
        hash: persisted.receipt.hash,
        status: persisted.receipt.status,
        actionType: result.receipt.actionType,
        simulated: persisted.receipt.simulated,
        timestamp: persisted.receipt.timestamp,
      }
    },
    [recordTransaction, revisions, walletId],
  )
  const persistRewardsState = useCallback(
    (args: { stateJson: string; expectedRevision?: number }) =>
      saveRewardsState({ wallet: walletId, stateJson: args.stateJson, expectedRevision: args.expectedRevision }),
    [saveRewardsState, walletId],
  )
  const persistSwapTransaction = useCallback(
    async (record: SwapTransactionRecord) => {
      const args = swapRecordToRecordSwapArgs(record, walletId)
      if (!args) return
      await recordSwap(args)
    },
    [recordSwap, walletId],
  )
  const convex = useConvex()
  const serverGetSwapQuote = useCallback(
    async (request: SwapQuoteRequest): Promise<SwapQuote> => {
      const quote = await convex.query(api.sandbox.swap.getQuote, {
        wallet: walletId,
        inputAssetId: request.inputAssetId,
        outputAssetId: request.outputAssetId,
        inputAmount: request.inputAmount,
        slippageBps: request.slippageBps,
      })
      return quote as unknown as SwapQuote
    },
    [convex, walletId],
  )
  const persistUmbrellaAction = useCallback<PersistUmbrellaAction>(
    (args) => recordUmbrellaAction({ wallet: walletId, ...args }),
    [recordUmbrellaAction, walletId],
  )
  const remoteUmbrellaState: ConvexUmbrellaSessionState | null | undefined =
    umbrellaSessionState === undefined ? undefined : (umbrellaSessionState as unknown as ConvexUmbrellaSessionState)
  return (
    <AvanaSessionsProvider
      walletId={walletId}
      persistBorrowTransaction={persistBorrowTransaction}
      persistLendTransaction={persistLendTransaction}
      persistMultiplyTransaction={persistMultiplyTransaction}
      persistSwapTransaction={persistSwapTransaction}
      serverGetSwapQuote={serverGetSwapQuote}
      remoteSwapTransactions={durableSwapTransactions ?? undefined}
      remoteRewardsState={rewardsState?.stateJson ?? (rewardsState === null ? null : undefined)}
      remoteRewardsRevision={rewardsState?.revision ?? (rewardsState === null ? null : undefined)}
      persistRewardsState={persistRewardsState}
      persistLocalState={false}
      remoteUmbrellaState={remoteUmbrellaState}
      persistUmbrellaAction={persistUmbrellaAction}
      persistUmbrellaState={false}
      sessionSource="convex"
      authoritativeWalletPending={walletHydrationPending}
    >
      <ConvexMarketSnapshotHydrators />
      <ConvexWalletHydrators walletId={walletId} onWalletHydrated={handleWalletHydrated} />
      {children}
    </AvanaSessionsProvider>
  )
}

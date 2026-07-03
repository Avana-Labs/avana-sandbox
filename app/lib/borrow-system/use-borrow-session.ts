"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { calculateCreditMetrics, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { mergeConvexMarketSnapshots, type ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import { assetsToShares, TOKEN_SCALE } from "@/app/lib/credit-engine/units"
import type {
  BaseReadAdapter,
  SandboxActionResult,
  SyntheticTransactionReceipt,
  TransactionAdapter,
  TransactionHistoryItem,
  TransactionIntent,
} from "@/app/lib/borrow-system/contracts"
import { createExecutionFingerprint } from "@/app/lib/borrow-system/execution-guard"
import { buildLegacyTransactionHistory, buildSyntheticReceipts } from "@/app/lib/borrow-system/read-model"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import { SandboxTransactionAdapter } from "@/app/lib/borrow-system/sandbox-transaction-adapter"
import {
  selectBorrowableAssets,
  selectAllAvailableCollateralPools,
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"
import {
  clearBorrowSessionState,
  readBorrowSessionMetadata,
  readBorrowSessionState,
  writeBorrowSessionMetadata,
  writeBorrowSessionState,
} from "@/app/lib/borrow-system/storage"

function mergeHistory(nextItem: TransactionHistoryItem, history: TransactionHistoryItem[]) {
  return [nextItem, ...history.filter((item) => item.id !== nextItem.id)]
}

function mergeReceipts(nextReceipt: SyntheticTransactionReceipt, receipts: SyntheticTransactionReceipt[]) {
  return [nextReceipt, ...receipts.filter((receipt) => receipt.id !== nextReceipt.id)]
}

/** Stable string for cross-tab change detection. History items carry bigint usd6 fields, so a
 *  plain JSON.stringify throws — coerce bigints to strings in the replacer. */
function serializeSessionSnapshot(
  transactionHistory: TransactionHistoryItem[],
  receipts: SyntheticTransactionReceipt[],
): string {
  return JSON.stringify({ h: transactionHistory, r: receipts }, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  )
}

export type ConvexBorrowWalletData = {
  balances?: Array<{ valueUsd: number }>
  positions: Array<{
    product: "borrow" | "lend" | "multiply"
    marketSlug: string
    collateral: Array<{
      _id: string
      marketSlug: string
      collateralShares: string
      principalTokenAmount: string
      collateralEnabled: boolean
      collateralValueUsd6?: string
    }>
    debt: Array<{
      _id: string
      assetId: string
      baseAssetId: string
      spokeId?: string
      marketSlug?: string
      debtSharesUsd6: string
      debtIndexRay: string
      borrowRateWad: string
      principalBorrowedUsd6: string
    }>
  }>
  transactions: Array<{
    _id: string
    intentId?: string
    product: "borrow" | "lend" | "multiply"
    kind: string
    status: "success" | "failed" | "pending"
    marketSlug?: string
    assetId?: string
    requestedAmountUsd6: string
    executedAmountUsd6: string
    syntheticTxHash: string
    simulated: boolean
    at: number
  }>
}

export function useBorrowSession({
  walletId,
  sessionSeed,
  readAdapter: injectedReadAdapter,
  transactionAdapter: injectedTransactionAdapter,
  persistState,
  persistTransaction,
}: {
  walletId: string
  sessionSeed: string
  readAdapter?: BaseReadAdapter
  transactionAdapter?: TransactionAdapter
  persistState?: boolean
  persistTransaction?: (result: SandboxActionResult) => Promise<{
    id: string
    hash: string
    status: "success" | "failed" | "pending"
    simulated: boolean
    timestamp: number
  }>
}) {
  const adapterMode = injectedReadAdapter?.mode ?? injectedTransactionAdapter?.mode ?? "sandbox"
  const shouldPersistState = persistState ?? adapterMode === "sandbox"
  const seededState = useMemo(() => deserializeBorrowSystemState(sessionSeed), [sessionSeed])
  const [state, setState] = useState<BorrowSystemState>(seededState)
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>(() =>
    buildLegacyTransactionHistory(seededState, walletId),
  )
  const [transactionReceipts, setTransactionReceipts] = useState<SyntheticTransactionReceipt[]>(() =>
    buildSyntheticReceipts(buildLegacyTransactionHistory(seededState, walletId)),
  )
  const stateRef = useRef(state)
  const lastPersistedAtRef = useRef(0)
  // Serialized snapshot of the last history/receipts this tab persisted or applied, so the
  // cross-tab storage handler detects a REAL change by CONTENT rather than a millisecond
  // timestamp (two tabs writing in the same ms otherwise let a stale tab drop the other's write).
  const lastSerializedRef = useRef<string | null>(null)
  const pendingExecutionsRef = useRef(new Map<string, Promise<SandboxActionResult>>())
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!shouldPersistState) {
      setState(seededState)
      setTransactionHistory([])
      setTransactionReceipts([])
      return
    }
    const nextState = readBorrowSessionState(walletId, sessionSeed)
    const metadata = readBorrowSessionMetadata(walletId)
    const fallbackHistory = buildLegacyTransactionHistory(nextState, walletId)

    setState(nextState)
    setTransactionHistory(metadata.transactionHistory.length > 0 ? metadata.transactionHistory : fallbackHistory)
    setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(fallbackHistory))
  }, [seededState, sessionSeed, shouldPersistState, walletId])

  useEffect(() => {
    // Skip while state is still the SSR seed (pre-hydration); persisting it here
    // would clobber richer data already in storage before the restore effect runs.
    if (!shouldPersistState || state === seededState) return
    writeBorrowSessionState(walletId, state)
  }, [shouldPersistState, walletId, state, seededState])

  useEffect(() => {
    if (!shouldPersistState) return
    // Stamp every write so other tabs can tell newer state from older. Track the
    // value locally so this tab never treats a stale cross-tab write as fresher
    // than what it just persisted.
    const persistedAt = Date.now()
    lastPersistedAtRef.current = persistedAt
    lastSerializedRef.current = serializeSessionSnapshot(transactionHistory, transactionReceipts)
    writeBorrowSessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
      persistedAt,
    })
  }, [shouldPersistState, transactionHistory, transactionReceipts, walletId])

  useEffect(() => {
    if (!shouldPersistState || typeof window === "undefined") return undefined

    const handleStorage = (event: StorageEvent) => {
      if (event.key == null || !event.key.endsWith(`:${walletId}`)) return

      const metadata = readBorrowSessionMetadata(walletId)
      // Multi-tab guard by CONTENT, not clock: apply only when the persisted history/receipts
      // actually differ from what this tab already holds. A millisecond timestamp let two tabs
      // writing in the same ms drop each other's change; comparing content also makes a
      // self-echo re-persist a no-op. (localStorage is last-writer-wins, so this read reflects
      // the newest snapshot.)
      const incomingSerialized = serializeSessionSnapshot(metadata.transactionHistory, metadata.receipts)
      if (incomingSerialized === lastSerializedRef.current) return
      lastSerializedRef.current = incomingSerialized
      if (metadata.persistedAt != null) lastPersistedAtRef.current = metadata.persistedAt

      const nextState = readBorrowSessionState(walletId, sessionSeed)
      const fallbackHistory = buildLegacyTransactionHistory(nextState, walletId)

      setState(nextState)
      setTransactionHistory(metadata.transactionHistory.length > 0 ? metadata.transactionHistory : fallbackHistory)
      setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(fallbackHistory))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [sessionSeed, shouldPersistState, walletId])

  const reset = useCallback(() => {
    if (shouldPersistState) clearBorrowSessionState(walletId)
    setState(seededState)
    const resetHistory = buildLegacyTransactionHistory(seededState, walletId)
    setTransactionHistory(resetHistory)
    setTransactionReceipts(buildSyntheticReceipts(resetHistory))
  }, [seededState, shouldPersistState, walletId])

  /**
   * Overlay Convex market reference data (liquidity/rates) onto the session so the
   * list, previews, and health factor all read the single source of truth. Wallet
   * positions are untouched. No-ops when there's no change (same state ref). The
   * caller (BorrowMarketHydrator) only invokes this when the Convex snapshot set
   * changes, so this never loops.
   */
  const hydrateMarketData = useCallback((snapshots: readonly ConvexMarketSnapshot[]) => {
    setState((prev) => mergeConvexMarketSnapshots(prev, snapshots))
  }, [])

  const hydrateWalletData = useCallback(
    (data: ConvexBorrowWalletData) => {
      const borrowPositions = data.positions.filter((position) => position.product === "borrow")
      const nextHistory: TransactionHistoryItem[] = data.transactions
        .filter((transaction) => transaction.product === "borrow")
        .map((transaction) => ({
          id: String(transaction._id),
          intentId: transaction.intentId ?? String(transaction._id),
          walletId,
          marketId: transaction.marketSlug,
          assetId: transaction.assetId,
          kind: transaction.kind as TransactionHistoryItem["kind"],
          status: transaction.status,
          requestedAmountUsd6: BigInt(transaction.requestedAmountUsd6),
          executedAmountUsd6: BigInt(transaction.executedAmountUsd6),
          simulated: transaction.simulated,
          timestamp: transaction.at,
          hash: transaction.syntheticTxHash,
        }))

      setState((current) => {
        const account = current.accounts[walletId]
        if (!account) return current
        return {
          ...current,
          accounts: {
            ...current.accounts,
            [walletId]: {
              ...account,
              walletBalanceUsd6: BigInt(
                Math.round((data.balances ?? []).reduce((sum, balance) => sum + balance.valueUsd, 0) * 1_000_000),
              ),
              collateralPositions: borrowPositions.flatMap((position) =>
                position.collateral.map((collateral) => {
                  let collateralShares = BigInt(collateral.collateralShares)
                  let principalTokenAmount = BigInt(collateral.principalTokenAmount)
                  // Onboarding-seeded collateral is stored as 0 shares + a USD value, because the
                  // seed has no access to the client's catalog LP prices. Derive real shares here
                  // from that USD using the live market price so the position values to the intended
                  // USD. Real supplied positions already carry correct (non-zero) shares.
                  const market = current.markets[collateral.marketSlug]
                  if (collateralShares === 0n && collateral.collateralValueUsd6 && market) {
                    const priceUsd6 = market.snapshot.lpTokenPriceUsd6
                    const tokenAmount =
                      priceUsd6 > 0n ? (BigInt(collateral.collateralValueUsd6) * TOKEN_SCALE) / priceUsd6 : 0n
                    collateralShares = assetsToShares(tokenAmount, market.snapshot.supplyIndexRay)
                    principalTokenAmount = tokenAmount
                  }
                  return {
                    id: String(collateral._id),
                    marketId: collateral.marketSlug,
                    collateralShares,
                    principalTokenAmount,
                    collateralEnabled: collateral.collateralEnabled,
                  }
                }),
              ),
              debtPositions: borrowPositions.flatMap((position) =>
                position.debt.map((debt) => ({
                  id: String(debt._id),
                  assetId: debt.assetId,
                  baseAssetId: debt.baseAssetId,
                  spokeId: debt.spokeId as import("@/app/lib/credit-engine").BorrowSpokeId,
                  marketId: debt.marketSlug,
                  debtSharesUsd6: BigInt(debt.debtSharesUsd6),
                  debtIndexRay: BigInt(debt.debtIndexRay),
                  borrowRateWad: BigInt(debt.borrowRateWad),
                  principalBorrowedUsd6: BigInt(debt.principalBorrowedUsd6),
                })),
              ),
              lastUpdatedAt: Math.max(account.lastUpdatedAt, ...nextHistory.map((item) => item.timestamp), 0),
            },
          },
        }
      })
      setTransactionHistory(nextHistory)
      setTransactionReceipts(buildSyntheticReceipts(nextHistory))
    },
    [walletId],
  )

  const transactionAdapter = useMemo(
    () => {
      if (injectedTransactionAdapter) return injectedTransactionAdapter
      return new SandboxTransactionAdapter({
        readState: () => stateRef.current,
        writeState: (nextState) => {
          stateRef.current = nextState
          setState(nextState)
        },
        persistResult: persistTransaction,
      })
    },
    [injectedTransactionAdapter, persistTransaction],
  )

  const createIntent = useCallback((action: BorrowAction) => transactionAdapter.createIntent(action), [transactionAdapter])
  const previewTransaction = useCallback(
    (intent: TransactionIntent) => transactionAdapter.previewTransaction(intent),
    [transactionAdapter],
  )
  const executeTransaction = useCallback(
    async (intent: TransactionIntent): Promise<SandboxActionResult> => {
      const fingerprint = createExecutionFingerprint(intent)
      const inFlight = pendingExecutionsRef.current.get(fingerprint)
      if (inFlight) {
        return inFlight
      }

      setIsPending(true)
      const execution = transactionAdapter
        .executeTransaction(intent)
        .then((result) => {
          stateRef.current = result.state
          setState(result.state)
          setTransactionHistory((current) => mergeHistory(result.historyItem, current))
          setTransactionReceipts((current) => mergeReceipts(result.receipt, current))
          return result
        })
        .finally(() => {
          pendingExecutionsRef.current.delete(fingerprint)
          setIsPending(pendingExecutionsRef.current.size > 0)
        })

      pendingExecutionsRef.current.set(fingerprint, execution)
      return execution
    },
    [transactionAdapter],
  )
  const readAdapter = useMemo(
    () => {
      if (injectedReadAdapter) return injectedReadAdapter
      return new SandboxBorrowReadAdapter({
        state,
        transactionHistory,
      })
    },
    [injectedReadAdapter, state, transactionHistory],
  )

  const metrics = useMemo(() => calculateCreditMetrics(state, walletId), [state, walletId])
  const marketSummaries = useMemo(() => selectBorrowMarketSummaries(state, walletId), [state, walletId])
  const borrowableAssets = useMemo(() => selectBorrowableAssets(state, walletId), [state, walletId])
  const collateralPools = useMemo(() => selectBorrowCollateralPools(state, walletId), [state, walletId])
  const availableCollateralPools = useMemo(
    () => selectAllAvailableCollateralPools(state, walletId),
    [state, walletId],
  )
  const initialDebts = useMemo(() => selectInitialBorrowDebts(state, walletId), [state, walletId])
  const walletSnapshot = useMemo(() => selectWalletBorrowSnapshot(state, walletId), [state, walletId])

  const getBorrowableAssetsForMarket = useCallback(
    (marketId?: string) => selectBorrowableAssets(state, walletId, marketId),
    [state, walletId],
  )

  return {
    state,
    metrics,
    marketSummaries,
    borrowableAssets,
    collateralPools,
    availableCollateralPools,
    initialDebts,
    walletSnapshot,
    transactionHistory,
    transactionReceipts,
    lastReceipt: transactionReceipts[0] ?? null,
    isPending,
    getBorrowableAssetsForMarket,
    readAdapter,
    createIntent,
    previewTransaction,
    executeTransaction,
    reset,
    hydrateMarketData,
    hydrateWalletData,
  }
}

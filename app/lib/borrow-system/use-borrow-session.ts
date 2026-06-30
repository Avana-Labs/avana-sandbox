"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { calculateCreditMetrics, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { mergeConvexMarketSnapshots, type ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
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
    writeBorrowSessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
    })
  }, [shouldPersistState, transactionHistory, transactionReceipts, walletId])

  useEffect(() => {
    if (!shouldPersistState || typeof window === "undefined") return undefined

    const handleStorage = (event: StorageEvent) => {
      if (event.key == null || !event.key.endsWith(`:${walletId}`)) return

      const nextState = readBorrowSessionState(walletId, sessionSeed)
      const metadata = readBorrowSessionMetadata(walletId)
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

  const transactionAdapter = useMemo(
    () => {
      if (injectedTransactionAdapter) return injectedTransactionAdapter
      return new SandboxTransactionAdapter({
        readState: () => stateRef.current,
        writeState: (nextState) => {
          stateRef.current = nextState
          setState(nextState)
        },
      })
    },
    [injectedTransactionAdapter],
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
      const previousState = stateRef.current
      const execution = transactionAdapter
        .executeTransaction(intent)
        .then(async (result) => {
          if (persistTransaction && result.receipt.status === "success") {
            try {
              const persisted = await persistTransaction(result)
              const receipt = {
                ...result.receipt,
                id: persisted.id,
                hash: persisted.hash,
                status: persisted.status,
                simulated: persisted.simulated,
                timestamp: persisted.timestamp,
              }
              const historyItem = {
                ...result.historyItem,
                id: persisted.id,
                hash: persisted.hash,
                status: persisted.status,
                timestamp: persisted.timestamp,
              }
              const persistedResult = { ...result, receipt, result: receipt, historyItem }
              setTransactionHistory((current) => mergeHistory(historyItem, current))
              setTransactionReceipts((current) => mergeReceipts(receipt, current))
              return persistedResult
            } catch (error) {
              stateRef.current = previousState
              setState(previousState)
              throw error
            }
          }
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
    [persistTransaction, transactionAdapter],
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
  }
}

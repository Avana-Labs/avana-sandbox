"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { calculateCreditMetrics, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { mergeConvexMarketSnapshots, type ConvexMarketSnapshot } from "@/app/lib/borrow-system/market-hydration"
import type { SandboxActionResult, SyntheticTransactionReceipt, TransactionHistoryItem, TransactionIntent } from "@/app/lib/borrow-system/contracts"
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
}: {
  walletId: string
  sessionSeed: string
}) {
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
    const nextState = readBorrowSessionState(walletId, sessionSeed)
    const metadata = readBorrowSessionMetadata(walletId)
    const fallbackHistory = buildLegacyTransactionHistory(nextState, walletId)

    setState(nextState)
    setTransactionHistory(metadata.transactionHistory.length > 0 ? metadata.transactionHistory : fallbackHistory)
    setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(fallbackHistory))
  }, [walletId, sessionSeed])

  useEffect(() => {
    // Skip while state is still the SSR seed (pre-hydration); persisting it here
    // would clobber richer data already in storage before the restore effect runs.
    if (state === seededState) return
    writeBorrowSessionState(walletId, state)
  }, [walletId, state, seededState])

  useEffect(() => {
    writeBorrowSessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
    })
  }, [transactionHistory, transactionReceipts, walletId])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

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
  }, [sessionSeed, walletId])

  const reset = useCallback(() => {
    clearBorrowSessionState(walletId)
    setState(seededState)
    const resetHistory = buildLegacyTransactionHistory(seededState, walletId)
    setTransactionHistory(resetHistory)
    setTransactionReceipts(buildSyntheticReceipts(resetHistory))
  }, [seededState, walletId])

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
    () =>
      new SandboxTransactionAdapter({
        readState: () => stateRef.current,
        writeState: (nextState) => {
          stateRef.current = nextState
          setState(nextState)
        },
      }),
    [],
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
    () =>
      new SandboxBorrowReadAdapter({
        state,
        transactionHistory,
      }),
    [state, transactionHistory],
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

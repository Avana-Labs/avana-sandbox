"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LendAction, LendSystemState } from "@/app/lib/lend-engine"
import { accrueLendSystemState } from "@/app/lib/lend-engine/simulation"
import { deserializeLendSystemState } from "./codec"
import type {
  LendReadAdapter,
  LendSandboxActionResult,
  LendTransactionAdapter,
  LendTransactionHistoryItem,
  LendTransactionIntent,
  LendTransactionResult,
} from "./contracts"
import { SandboxLendReadAdapter } from "./sandbox-read-adapter"
import { SandboxLendTransactionAdapter } from "./sandbox-transaction-adapter"
import { mergeConvexLendSnapshots, type LendConvexSnapshot } from "./market-hydration"
import {
  clearLendSessionState,
  readLendSessionMetadata,
  readLendSessionState,
  writeLendSessionMetadata,
  writeLendSessionState,
} from "./storage"
import { LEND_SESSION_SYNC_EVENT } from "./session-sync"

function mergeHistory(nextItem: LendTransactionHistoryItem, history: LendTransactionHistoryItem[]) {
  return [nextItem, ...history.filter((item) => item.id !== nextItem.id)]
}

function mergeReceipts(nextReceipt: LendTransactionResult, receipts: LendTransactionResult[]) {
  return [nextReceipt, ...receipts.filter((receipt) => receipt.id !== nextReceipt.id)]
}

export type ConvexLendWalletData = {
  positions: Array<{
    _id: string
    product: "borrow" | "lend" | "multiply"
    marketSlug: string
    status: "open" | "closed"
    suppliedUsd6?: string
    earnedUsd6?: string
    openedAt: number
    lastUpdatedAt: number
  }>
  transactions: Array<{
    _id: string
    intentId?: string
    product: "borrow" | "lend" | "multiply"
    kind: string
    status: "success" | "failed" | "pending"
    marketSlug?: string
    amountUsd: number
    syntheticTxHash: string
    simulated: boolean
    at: number
  }>
}

export function useLendSession({
  walletId,
  sessionSeed,
  readAdapter: injectedReadAdapter,
  transactionAdapter: injectedTransactionAdapter,
  persistState,
  persistTransaction,
}: {
  walletId: string
  sessionSeed: string
  readAdapter?: LendReadAdapter
  transactionAdapter?: LendTransactionAdapter
  persistState?: boolean
  persistTransaction?: (result: LendSandboxActionResult) => Promise<LendTransactionResult>
}) {
  const adapterMode = injectedReadAdapter?.mode ?? injectedTransactionAdapter?.mode ?? "sandbox"
  const shouldPersistState = persistState ?? adapterMode === "sandbox"
  const seededState = useMemo(() => deserializeLendSystemState(sessionSeed), [sessionSeed])
  const [state, setState] = useState<LendSystemState>(seededState)
  const [transactionHistory, setTransactionHistory] = useState<LendTransactionHistoryItem[]>(
    () => (shouldPersistState ? readLendSessionMetadata(walletId).transactionHistory : []),
  )
  const [transactionReceipts, setTransactionReceipts] = useState<LendTransactionResult[]>(
    () => (shouldPersistState ? readLendSessionMetadata(walletId).receipts : []),
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)

  useEffect(() => {
    if (!shouldPersistState) {
      setState(seededState)
      setTransactionHistory([])
      setTransactionReceipts([])
      return
    }
    const nextState = readLendSessionState(walletId, sessionSeed)
    const metadata = readLendSessionMetadata(walletId)
    setState(nextState)
    setTransactionHistory(metadata.transactionHistory)
    setTransactionReceipts(metadata.receipts)
  }, [seededState, sessionSeed, shouldPersistState, walletId])

  useEffect(() => {
    if (!shouldPersistState) return
    // Skip while state is still the SSR seed (pre-hydration); persisting it here
    // would clobber richer data already in storage before the restore effect runs.
    if (state === seededState) return
    isPersistingRef.current = true
    writeLendSessionState(walletId, state)
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [shouldPersistState, walletId, state, seededState])

  useEffect(() => {
    if (!shouldPersistState) return
    isPersistingRef.current = true
    writeLendSessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
    })
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [shouldPersistState, walletId, transactionHistory, transactionReceipts])

  useEffect(() => {
    if (!shouldPersistState || typeof window === "undefined") return undefined
    if (typeof window === "undefined") return undefined

    const reloadFromStorage = () => {
      const nextState = readLendSessionState(walletId, sessionSeed)
      const metadata = readLendSessionMetadata(walletId)
      setState(nextState)
      setTransactionHistory(metadata.transactionHistory)
      setTransactionReceipts(metadata.receipts)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key == null || !event.key.endsWith(`:${walletId}`)) return
      reloadFromStorage()
    }

    const handleSameTabSync = (event: Event) => {
      const detail = (event as CustomEvent<{ walletId: string }>).detail
      if (detail?.walletId !== walletId || isPersistingRef.current) return
      reloadFromStorage()
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(LEND_SESSION_SYNC_EVENT, handleSameTabSync)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(LEND_SESSION_SYNC_EVENT, handleSameTabSync)
    }
  }, [sessionSeed, shouldPersistState, walletId])

  useEffect(() => {
    if (!shouldPersistState || typeof window === "undefined" || process.env.NODE_ENV === "test") return undefined

    const tick = () => {
      setState((current) => {
        // Without an active position nothing user-visible accrues, so return the
        // same reference to avoid re-rendering the whole app tree every 30s.
        const hasActivePosition = Object.values(current.positions).some((position) => position.status === "active")
        if (!hasActivePosition) return current
        return accrueLendSystemState(current, Date.now())
      })
    }

    tick()
    const intervalId = window.setInterval(tick, 30_000)
    return () => window.clearInterval(intervalId)
  }, [shouldPersistState])

  const transactionAdapter = useMemo(
    () => {
      if (injectedTransactionAdapter) return injectedTransactionAdapter
      return new SandboxLendTransactionAdapter({
        readState: () => stateRef.current,
        writeState: setState,
      })
    },
    [injectedTransactionAdapter],
  )

  const readAdapter = useMemo(
    () => {
      if (injectedReadAdapter) return injectedReadAdapter
      return new SandboxLendReadAdapter({ state, transactionHistory })
    },
    [injectedReadAdapter, state, transactionHistory],
  )

  const hydrateMarketData = useCallback((snapshots: readonly LendConvexSnapshot[]) => {
    setState((prev) => mergeConvexLendSnapshots(prev, snapshots))
  }, [])

  const hydrateWalletData = useCallback(
    (data: ConvexLendWalletData) => {
      const positions = Object.fromEntries(
        data.positions
          .filter((position) => position.product === "lend")
          .map((position) => {
            const market = stateRef.current.markets[position.marketSlug]
            const suppliedValueUsd = Number(BigInt(position.suppliedUsd6 ?? "0")) / 1_000_000
            const suppliedAmount = market?.assetPriceUsd ? suppliedValueUsd / market.assetPriceUsd : suppliedValueUsd
            const earnedUsd = Number(BigInt(position.earnedUsd6 ?? "0")) / 1_000_000
            const id = String(position._id)
            return [
              id,
              {
                positionId: id,
                walletId,
                marketId: position.marketSlug,
                asset: market?.asset.symbol ?? position.marketSlug,
                principalAmount: Math.max(0, suppliedAmount - earnedUsd),
                scaledBalance: suppliedAmount,
                liquidityIndexAtLastAction: market?.liquidityIndex ?? 1,
                currentSuppliedAmount: suppliedAmount,
                interestEarned: earnedUsd,
                rewardsEarnedUsd: 0,
                suppliedValueUsd,
                openedAt: position.openedAt,
                updatedAt: position.lastUpdatedAt,
                status: position.status === "open" ? ("active" as const) : ("closed" as const),
              },
            ]
          }),
      )
      const history: LendTransactionHistoryItem[] = data.transactions
        .filter((transaction) => transaction.product === "lend")
        .map((transaction) => ({
          id: String(transaction._id),
          intentId: transaction.intentId ?? String(transaction._id),
          walletId,
          marketId: transaction.marketSlug ?? "rewards",
          kind: transaction.kind as LendTransactionHistoryItem["kind"],
          status: transaction.status,
          asset: stateRef.current.markets[transaction.marketSlug ?? ""]?.asset.symbol ?? "",
          amount: transaction.amountUsd,
          simulated: transaction.simulated,
          timestamp: transaction.at,
          hash: transaction.syntheticTxHash,
        }))
      setState((current) => ({ ...current, positions }))
      setTransactionHistory(history)
      setTransactionReceipts(
        history.map((item) => ({
          id: item.id,
          hash: item.hash,
          status: item.status,
          actionType: item.kind,
          simulated: item.simulated,
          timestamp: item.timestamp,
        })),
      )
    },
    [walletId],
  )

  const createIntent = useCallback((action: LendAction) => transactionAdapter.createIntent(action), [transactionAdapter])

  const previewTransaction = useCallback(
    (intent: LendTransactionIntent) => transactionAdapter.previewTransaction(intent),
    [transactionAdapter],
  )

  const executeTransaction = useCallback(
    async (intent: LendTransactionIntent): Promise<LendSandboxActionResult> => {
      const previousState = stateRef.current
      const result = await transactionAdapter.executeTransaction(intent)
      try {
        const receipt = persistTransaction ? await persistTransaction(result) : result.receipt
        const historyItem = { ...result.historyItem, id: receipt.id, hash: receipt.hash, timestamp: receipt.timestamp }
        const persistedResult = { ...result, receipt, historyItem }
        setState(result.state)
        setTransactionHistory((current) => mergeHistory(historyItem, current))
        setTransactionReceipts((current) => mergeReceipts(receipt, current))
        return persistedResult
      } catch (error) {
        stateRef.current = previousState
        setState(previousState)
        throw error
      }
    },
    [persistTransaction, transactionAdapter],
  )

  const claimRewards = useCallback(async () => {
    const intent = transactionAdapter.createIntent({
      type: "claim",
      walletId,
    })
    return executeTransaction(intent)
  }, [executeTransaction, transactionAdapter, walletId])

  const reset = useCallback(() => {
    if (shouldPersistState) {
      clearLendSessionState(walletId)
    }
    setState(seededState)
    setTransactionHistory([])
    setTransactionReceipts([])
  }, [seededState, shouldPersistState, walletId])

  return {
    walletId,
    state,
    readAdapter,
    transactionHistory,
    transactionReceipts,
    hydrateMarketData,
    hydrateWalletData,
    createIntent,
    previewTransaction,
    executeTransaction,
    claimRewards,
    reset,
    isPending: false,
  }
}

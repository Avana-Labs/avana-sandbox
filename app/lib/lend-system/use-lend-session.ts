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

export function useLendSession({
  walletId,
  sessionSeed,
  readAdapter: injectedReadAdapter,
  transactionAdapter: injectedTransactionAdapter,
  persistState,
}: {
  walletId: string
  sessionSeed: string
  readAdapter?: LendReadAdapter
  transactionAdapter?: LendTransactionAdapter
  persistState?: boolean
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

  const createIntent = useCallback((action: LendAction) => transactionAdapter.createIntent(action), [transactionAdapter])

  const previewTransaction = useCallback(
    (intent: LendTransactionIntent) => transactionAdapter.previewTransaction(intent),
    [transactionAdapter],
  )

  const executeTransaction = useCallback(
    async (intent: LendTransactionIntent): Promise<LendSandboxActionResult> => {
      const result = await transactionAdapter.executeTransaction(intent)
      setState(result.state)
      setTransactionHistory((current) => mergeHistory(result.historyItem, current))
      setTransactionReceipts((current) => mergeReceipts(result.receipt, current))
      return result
    },
    [transactionAdapter],
  )

  const claimRewards = useCallback(async () => {
    const intent = transactionAdapter.createIntent({
      type: "claim",
      walletId,
    })
    const result = await transactionAdapter.executeTransaction(intent)
    setState(result.state)
    setTransactionHistory((current) => mergeHistory(result.historyItem, current))
    setTransactionReceipts((current) => mergeReceipts(result.receipt, current))
    return result
  }, [transactionAdapter, walletId])

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
    createIntent,
    previewTransaction,
    executeTransaction,
    claimRewards,
    reset,
    isPending: false,
  }
}

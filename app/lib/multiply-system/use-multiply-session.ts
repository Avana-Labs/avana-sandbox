"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MultiplyAction, MultiplySystemState } from "@/app/lib/multiply-engine"
import { deserializeMultiplySystemState } from "./codec"
import type { MultiplySandboxActionResult, MultiplyTransactionHistoryItem, MultiplyTransactionIntent, MultiplyTransactionResult } from "./contracts"
import { buildSyntheticReceipts } from "./read-model"
import { SandboxMultiplyReadAdapter } from "./sandbox-read-adapter"
import { SandboxMultiplyTransactionAdapter } from "./sandbox-transaction-adapter"
import {
  clearMultiplySessionState,
  readMultiplySessionMetadata,
  readMultiplySessionState,
  writeMultiplySessionMetadata,
  writeMultiplySessionState,
} from "./storage"
import { MULTIPLY_SESSION_SYNC_EVENT } from "./session-sync"

function mergeHistory(nextItem: MultiplyTransactionHistoryItem, history: MultiplyTransactionHistoryItem[]) {
  return [nextItem, ...history.filter((item) => item.id !== nextItem.id)]
}

function mergeReceipts(nextReceipt: MultiplyTransactionResult, receipts: MultiplyTransactionResult[]) {
  return [nextReceipt, ...receipts.filter((receipt) => receipt.id !== nextReceipt.id)]
}

export function useMultiplySession({
  walletId,
  sessionSeed,
}: {
  walletId: string
  sessionSeed: string
}) {
  const seededState = useMemo(() => deserializeMultiplySystemState(sessionSeed), [sessionSeed])
  const [state, setState] = useState<MultiplySystemState>(seededState)
  const [transactionHistory, setTransactionHistory] = useState<MultiplyTransactionHistoryItem[]>(
    () => readMultiplySessionMetadata(walletId).transactionHistory,
  )
  const [transactionReceipts, setTransactionReceipts] = useState<MultiplyTransactionResult[]>(() =>
    buildSyntheticReceipts(readMultiplySessionMetadata(walletId).transactionHistory),
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)

  useEffect(() => {
    const nextState = readMultiplySessionState(walletId, sessionSeed)
    const metadata = readMultiplySessionMetadata(walletId)
    setState(nextState)
    setTransactionHistory(metadata.transactionHistory)
    setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(metadata.transactionHistory))
  }, [walletId, sessionSeed])

  useEffect(() => {
    // Skip while state is still the SSR seed (pre-hydration); persisting it here
    // would clobber richer data already in storage before the restore effect runs.
    if (state === seededState) return
    isPersistingRef.current = true
    writeMultiplySessionState(walletId, state)
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [walletId, state, seededState])

  useEffect(() => {
    isPersistingRef.current = true
    writeMultiplySessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
    })
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [walletId, transactionHistory, transactionReceipts])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const reloadFromStorage = () => {
      const nextState = readMultiplySessionState(walletId, sessionSeed)
      const metadata = readMultiplySessionMetadata(walletId)
      setState(nextState)
      setTransactionHistory(metadata.transactionHistory)
      setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(metadata.transactionHistory))
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
    window.addEventListener(MULTIPLY_SESSION_SYNC_EVENT, handleSameTabSync)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(MULTIPLY_SESSION_SYNC_EVENT, handleSameTabSync)
    }
  }, [sessionSeed, walletId])

  const transactionAdapter = useMemo(
    () =>
      new SandboxMultiplyTransactionAdapter({
        readState: () => stateRef.current,
        writeState: setState,
      }),
    [],
  )

  const readAdapter = useMemo(
    () => new SandboxMultiplyReadAdapter({ state, transactionHistory }),
    [state, transactionHistory],
  )

  const createIntent = useCallback(
    (action: MultiplyAction) => transactionAdapter.createIntent(action),
    [transactionAdapter],
  )

  const previewTransaction = useCallback(
    (intent: MultiplyTransactionIntent) => transactionAdapter.previewTransaction(intent),
    [transactionAdapter],
  )

  const executeTransaction = useCallback(
    async (intent: MultiplyTransactionIntent): Promise<MultiplySandboxActionResult> => {
      const result = await transactionAdapter.executeTransaction(intent)
      setState(result.state)
      setTransactionHistory((current) => mergeHistory(result.historyItem, current))
      setTransactionReceipts((current) => mergeReceipts(result.receipt, current))
      return result
    },
    [transactionAdapter],
  )

  const reset = useCallback(() => {
    clearMultiplySessionState(walletId)
    setState(seededState)
    setTransactionHistory([])
    setTransactionReceipts([])
  }, [seededState, walletId])

  return {
    walletId,
    state,
    readAdapter,
    transactionHistory,
    transactionReceipts,
    createIntent,
    previewTransaction,
    executeTransaction,
    reset,
    isPending: false,
  }
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MultiplyAction, MultiplySystemState } from "@/app/lib/multiply-engine"
import { deserializeMultiplySystemState, serializeMultiplySystemState } from "./codec"
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
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false)
  const [transactionHistory, setTransactionHistory] = useState<MultiplyTransactionHistoryItem[]>(
    () => readMultiplySessionMetadata(walletId).transactionHistory,
  )
  const [transactionReceipts, setTransactionReceipts] = useState<MultiplyTransactionResult[]>(() =>
    buildSyntheticReceipts(readMultiplySessionMetadata(walletId).transactionHistory),
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)
  const lastPersistedStateRef = useRef<string | null>(null)
  const lastPersistedMetadataRef = useRef<string | null>(null)

  useEffect(() => {
    const nextState = readMultiplySessionState(walletId, sessionSeed)
    const metadata = readMultiplySessionMetadata(walletId)
    lastPersistedStateRef.current = serializeMultiplySystemState(nextState)
    lastPersistedMetadataRef.current = JSON.stringify({
      transactionHistory: metadata.transactionHistory,
      receipts: metadata.receipts,
    })
    setState(nextState)
    setTransactionHistory(metadata.transactionHistory)
    setTransactionReceipts(metadata.receipts.length > 0 ? metadata.receipts : buildSyntheticReceipts(metadata.transactionHistory))
    setHasHydratedStorage(true)
  }, [walletId, sessionSeed])

  useEffect(() => {
    if (!hasHydratedStorage) return
    const serializedState = serializeMultiplySystemState(state)
    if (serializedState === lastPersistedStateRef.current) return
    isPersistingRef.current = true
    lastPersistedStateRef.current = serializedState
    writeMultiplySessionState(walletId, state)
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [hasHydratedStorage, walletId, state])

  useEffect(() => {
    if (!hasHydratedStorage) return
    const metadata = {
      transactionHistory,
      receipts: transactionReceipts,
    }
    const serializedMetadata = JSON.stringify(metadata)
    if (serializedMetadata === lastPersistedMetadataRef.current) return
    isPersistingRef.current = true
    lastPersistedMetadataRef.current = serializedMetadata
    writeMultiplySessionMetadata(walletId, metadata)
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [hasHydratedStorage, walletId, transactionHistory, transactionReceipts])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const reloadFromStorage = () => {
      const nextState = readMultiplySessionState(walletId, sessionSeed)
      const metadata = readMultiplySessionMetadata(walletId)
      const serializedState = serializeMultiplySystemState(nextState)
      const serializedMetadata = JSON.stringify({
        transactionHistory: metadata.transactionHistory,
        receipts: metadata.receipts,
      })
      if (
        serializedState === lastPersistedStateRef.current &&
        serializedMetadata === lastPersistedMetadataRef.current
      ) {
        return
      }
      lastPersistedStateRef.current = serializedState
      lastPersistedMetadataRef.current = serializedMetadata
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

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LendAction, LendSystemState } from "@/app/lib/lend-engine"
import { deserializeLendSystemState } from "./codec"
import type { LendSandboxActionResult, LendTransactionHistoryItem, LendTransactionIntent, LendTransactionResult } from "./contracts"
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
}: {
  walletId: string
  sessionSeed: string
}) {
  const seededState = useMemo(() => deserializeLendSystemState(sessionSeed), [sessionSeed])
  const [state, setState] = useState<LendSystemState>(seededState)
  const [transactionHistory, setTransactionHistory] = useState<LendTransactionHistoryItem[]>(
    () => readLendSessionMetadata(walletId).transactionHistory,
  )
  const [transactionReceipts, setTransactionReceipts] = useState<LendTransactionResult[]>(
    () => readLendSessionMetadata(walletId).receipts,
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const isPersistingRef = useRef(false)

  useEffect(() => {
    const nextState = readLendSessionState(walletId, sessionSeed)
    const metadata = readLendSessionMetadata(walletId)
    setState(nextState)
    setTransactionHistory(metadata.transactionHistory)
    setTransactionReceipts(metadata.receipts)
  }, [walletId, sessionSeed])

  useEffect(() => {
    isPersistingRef.current = true
    writeLendSessionState(walletId, state)
    queueMicrotask(() => {
      isPersistingRef.current = false
    })
  }, [walletId, state])

  useEffect(() => {
    isPersistingRef.current = true
    writeLendSessionMetadata(walletId, {
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
  }, [sessionSeed, walletId])

  const transactionAdapter = useMemo(
    () =>
      new SandboxLendTransactionAdapter({
        readState: () => stateRef.current,
        writeState: setState,
      }),
    [],
  )

  const readAdapter = useMemo(
    () => new SandboxLendReadAdapter({ state, transactionHistory }),
    [state, transactionHistory],
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
    clearLendSessionState(walletId)
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
    claimRewards,
    reset,
    isPending: false,
  }
}

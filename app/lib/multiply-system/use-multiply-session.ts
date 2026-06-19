"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MultiplyAction, MultiplySystemState } from "@/app/lib/multiply-engine"
import { deserializeMultiplySystemState } from "./codec"
import type { MultiplySandboxActionResult, MultiplyTransactionHistoryItem, MultiplyTransactionIntent, MultiplyTransactionResult } from "./contracts"
import { buildSyntheticReceipts } from "./read-model"
import { SandboxMultiplyReadAdapter } from "./sandbox-read-adapter"
import { SandboxMultiplyTransactionAdapter } from "./sandbox-transaction-adapter"
import { readMultiplySessionMetadata, writeMultiplySessionMetadata } from "./storage"

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

  useEffect(() => {
    writeMultiplySessionMetadata(walletId, {
      transactionHistory,
      receipts: transactionReceipts,
    })
  }, [walletId, transactionHistory, transactionReceipts])

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
    setState(seededState)
    setTransactionHistory([])
    setTransactionReceipts([])
  }, [seededState])

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

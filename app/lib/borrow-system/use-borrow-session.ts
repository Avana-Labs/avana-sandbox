"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { applyBorrowAction, calculateCreditMetrics, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import type { SandboxActionResult, TransactionIntent } from "@/app/lib/borrow-system/contracts"
import { SandboxBorrowReadAdapter } from "@/app/lib/borrow-system/sandbox-read-adapter"
import { SandboxTransactionAdapter } from "@/app/lib/borrow-system/sandbox-transaction-adapter"
import {
  selectBorrowableAssets,
  selectBorrowCollateralPools,
  selectBorrowMarketSummaries,
  selectInitialBorrowDebts,
  selectWalletBorrowSnapshot,
} from "@/app/lib/borrow-system/selectors"
import { clearBorrowSessionState, readBorrowSessionState, writeBorrowSessionState } from "@/app/lib/borrow-system/storage"

export function useBorrowSession({
  walletId,
  sessionSeed,
}: {
  walletId: string
  sessionSeed: string
}) {
  const seededState = useMemo(() => deserializeBorrowSystemState(sessionSeed), [sessionSeed])
  const [state, setState] = useState<BorrowSystemState>(seededState)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    setState(readBorrowSessionState(walletId, sessionSeed))
  }, [walletId, sessionSeed])

  useEffect(() => {
    writeBorrowSessionState(walletId, state)
  }, [walletId, state])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const handleStorage = (event: StorageEvent) => {
      if (event.key == null || !event.key.endsWith(`:${walletId}`) || event.newValue == null) return
      setState(deserializeBorrowSystemState(event.newValue))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [walletId])

  const dispatch = useCallback((action: BorrowAction) => {
    setState((current) =>
      applyBorrowAction(current, {
        ...action,
        at: action.at ?? Date.now(),
      }),
    )
  }, [])

  const reset = useCallback(() => {
    clearBorrowSessionState(walletId)
    setState(seededState)
  }, [seededState, walletId])

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
    (intent: TransactionIntent): Promise<SandboxActionResult> => transactionAdapter.executeTransaction(intent),
    [transactionAdapter],
  )
  const readAdapter = useMemo(() => new SandboxBorrowReadAdapter({ state }), [state])

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
    getBorrowableAssetsForMarket,
    readAdapter,
    createIntent,
    previewTransaction,
    executeTransaction,
    dispatch,
    reset,
  }
}

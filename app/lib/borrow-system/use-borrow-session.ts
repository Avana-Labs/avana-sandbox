"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { applyBorrowAction, calculateCreditMetrics, type BorrowAction, type BorrowSystemState } from "@/app/lib/credit-engine"
import { deserializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
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
    dispatch,
    reset,
  }
}

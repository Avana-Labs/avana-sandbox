"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DEMO_SWAP_BALANCES } from "./wallet-balances"
import { MockSwapProvider, type SwapQuoteRequest } from "./quote-provider"
import { SandboxSwapTransactionAdapter, type SwapExecutionOptions, type SwapSystemState } from "./transaction-adapter"
import type { UserAssetBalance } from "./contracts"
import { readSwapSessionState, writeSwapSessionState } from "./storage"

export function createInitialSwapSystemState(walletId: string): SwapSystemState {
  const seededBalances = DEMO_SWAP_BALANCES.filter((balance) => balance.walletId === "demo-wallet").map((balance) => ({
    ...balance,
    id: balance.id.replace("demo-wallet", walletId),
    walletId,
  }))

  return {
    balances: seededBalances,
    allowances: {},
    transactions: [],
  }
}

export function useSwapSession({ walletId, persistState = true }: { walletId: string; persistState?: boolean }) {
  const seededState = useMemo(() => createInitialSwapSystemState(walletId), [walletId])
  const [state, setState] = useState<SwapSystemState>(seededState)
  const [hydratedWalletId, setHydratedWalletId] = useState<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    setState(persistState ? readSwapSessionState(walletId, seededState) : seededState)
    setHydratedWalletId(walletId)
  }, [persistState, seededState, walletId])

  useEffect(() => {
    if (!persistState || hydratedWalletId !== walletId) return
    writeSwapSessionState(walletId, state)
  }, [hydratedWalletId, persistState, state, walletId])

  useEffect(() => {
    if (!persistState || typeof window === "undefined") return undefined
    const reload = () => setState(readSwapSessionState(walletId, seededState))
    const handleStorage = (event: StorageEvent) => {
      if (event.key === `avana.swap.session.v1:${walletId}`) reload()
    }
    const handleSameTab = (event: Event) => {
      const detail = (event as CustomEvent<{ walletId?: string }>).detail
      if (detail?.walletId === walletId) reload()
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("avana:swap-session-updated", handleSameTab)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("avana:swap-session-updated", handleSameTab)
    }
  }, [persistState, seededState, walletId])

  const adapter = useMemo(
    () =>
      new SandboxSwapTransactionAdapter({
        readState: () => stateRef.current,
        writeState: (next) => {
          stateRef.current = next
          setState(next)
        },
        provider: new MockSwapProvider(),
      }),
    [],
  )

  const walletBalances = useMemo(
    () => state.balances.filter((balance): balance is UserAssetBalance => balance.walletId === walletId),
    [state.balances, walletId],
  )

  const getQuote = useCallback(
    (request: Omit<SwapQuoteRequest, "walletId">) => adapter.provider.getQuote({ ...request, walletId }),
    [adapter, walletId],
  )
  const requiresApproval = useCallback(
    (assetId: string, amount: number) => adapter.requiresApproval(walletId, assetId, amount),
    [adapter, walletId],
  )
  const approve = useCallback(
    (assetId: string, amount: number, options?: SwapExecutionOptions) =>
      adapter.approve(walletId, assetId, amount, options),
    [adapter, walletId],
  )
  const executeSwap = useCallback(
    (quote: Parameters<typeof adapter.executeSwap>[0], options?: SwapExecutionOptions) =>
      adapter.executeSwap(quote, walletId, options),
    [adapter, walletId],
  )

  return {
    walletId,
    isHydrated: hydratedWalletId === walletId,
    state,
    walletBalances,
    transactionHistory: state.transactions,
    getQuote,
    requiresApproval,
    approve,
    executeSwap,
  }
}

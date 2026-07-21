"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { DEMO_SWAP_BALANCES } from "./wallet-balances"
import { MockSwapProvider, type SwapQuoteRequest } from "./quote-provider"
import {
  SandboxSwapTransactionAdapter,
  type SwapExecutionOptions,
  type SwapSystemState,
} from "./transaction-adapter"
import type { UserAssetBalance } from "./contracts"

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

export function useSwapSession({ walletId }: { walletId: string }) {
  const [state, setState] = useState<SwapSystemState>(() => createInitialSwapSystemState(walletId))
  const stateRef = useRef(state)
  stateRef.current = state

  const adapter = useMemo(
    () =>
      new SandboxSwapTransactionAdapter({
        readState: () => stateRef.current,
        writeState: setState,
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
    (assetId: string, amount: number, options?: SwapExecutionOptions) => adapter.approve(walletId, assetId, amount, options),
    [adapter, walletId],
  )
  const executeSwap = useCallback(
    (quote: Parameters<typeof adapter.executeSwap>[0], options?: SwapExecutionOptions) =>
      adapter.executeSwap(quote, walletId, options),
    [adapter, walletId],
  )

  return {
    walletId,
    state,
    walletBalances,
    transactionHistory: state.transactions,
    getQuote,
    requiresApproval,
    approve,
    executeSwap,
  }
}

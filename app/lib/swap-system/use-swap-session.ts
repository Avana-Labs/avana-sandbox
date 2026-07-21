"use client"

import { useMemo, useRef, useState } from "react"
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

  return {
    walletId,
    state,
    walletBalances,
    transactionHistory: state.transactions,
    getQuote: (request: Omit<SwapQuoteRequest, "walletId">) => adapter.provider.getQuote({ ...request, walletId }),
    requiresApproval: (assetId: string, amount: number) => adapter.requiresApproval(walletId, assetId, amount),
    approve: (assetId: string, amount: number, options?: SwapExecutionOptions) =>
      adapter.approve(walletId, assetId, amount, options),
    executeSwap: (quote: Parameters<typeof adapter.executeSwap>[0], options?: SwapExecutionOptions) =>
      adapter.executeSwap(quote, walletId, options),
  }
}

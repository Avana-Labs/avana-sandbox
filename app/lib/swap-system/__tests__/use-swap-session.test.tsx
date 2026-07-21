import { renderHook, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { useSwapSession } from "@/app/lib/swap-system"

describe("useSwapSession", () => {
  beforeEach(() => localStorage.clear())

  it("executes a native wallet swap through shared session state", async () => {
    const { result } = renderHook(() => useSwapSession({ walletId: "demo-wallet", persistState: false }))
    const quote = await result.current.getQuote({
      chainId: 1,
      inputAssetId: "eth",
      outputAssetId: "usdc",
      inputAmount: 0.001,
      slippageBps: 50,
    })

    await act(async () => {
      await result.current.executeSwap(quote)
    })

    await waitFor(() => {
      expect(result.current.transactionHistory[0]).toMatchObject({ status: "confirmed" })
    })
    expect(result.current.walletBalances.find((balance) => balance.id === "wallet-eth")?.amount).toBe(0.011)
  })

  it("rehydrates wallet balances and transaction history", async () => {
    const walletId = "persisted-swap-wallet"
    const first = renderHook(() => useSwapSession({ walletId }))
    await waitFor(() => expect(first.result.current.isHydrated).toBe(true))
    const quote = await first.result.current.getQuote({
      chainId: 1,
      inputAssetId: "eth",
      outputAssetId: "usdc",
      inputAmount: 0.001,
      slippageBps: 50,
    })

    await act(async () => {
      await first.result.current.executeSwap(quote)
    })
    await waitFor(() => expect(first.result.current.transactionHistory).toHaveLength(1))
    first.unmount()

    const restored = renderHook(() => useSwapSession({ walletId }))
    await waitFor(() => expect(restored.result.current.isHydrated).toBe(true))
    expect(restored.result.current.transactionHistory[0]).toMatchObject({
      inputAssetId: "eth",
      outputAssetId: "usdc",
      status: "confirmed",
    })
    expect(restored.result.current.walletBalances.find((balance) => balance.assetId === "eth")?.amount).toBe(0.011)
  })
})

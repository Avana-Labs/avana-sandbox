import { renderHook, waitFor } from "@testing-library/react"
import { act } from "react"
import { describe, expect, it } from "vitest"
import { useSwapSession } from "@/app/lib/swap-system"

describe("useSwapSession", () => {
  it("executes a native wallet swap through shared session state", async () => {
    const { result } = renderHook(() => useSwapSession({ walletId: "demo-wallet" }))
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
})

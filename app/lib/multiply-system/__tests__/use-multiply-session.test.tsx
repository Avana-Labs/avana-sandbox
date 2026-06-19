import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { buildMultiplySessionSeed } from "@/app/lib/multiply-system/demo-session"
import { writeMultiplySessionMetadata, writeMultiplySessionState } from "@/app/lib/multiply-system/storage"
import { buildMockMultiplySystemStateWithSeedPosition } from "@/app/lib/multiply-system/mock"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"

describe("useMultiplySession", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("hydrates persisted multiply state and executes a simulated multiply", async () => {
    const walletId = "demo-wallet"
    const seededState = buildMockMultiplySystemStateWithSeedPosition(walletId)
    const sessionSeed = buildMultiplySessionSeed(walletId)

    writeMultiplySessionState(walletId, seededState)

    const { result } = renderHook(() =>
      useMultiplySession({
        walletId,
        sessionSeed,
      }),
    )

    expect(Object.keys(result.current.state.positions).length).toBeGreaterThan(0)

    await act(async () => {
      const intent = result.current.createIntent({
        type: "multiply",
        walletId,
        marketId: "usdc-gho",
        collateralAmount: 500,
        selectedMultiplier: 2,
      })
      const preview = await result.current.previewTransaction(intent)
      expect(preview.allowed).toBe(true)
      await result.current.executeTransaction(intent)
    })

    expect(Object.keys(result.current.state.positions).length).toBeGreaterThan(1)
    expect(result.current.transactionHistory.length).toBeGreaterThan(0)
  })

  it("reloads metadata history on hydration", () => {
    const walletId = "demo-wallet"
    const seededState = buildMockMultiplySystemStateWithSeedPosition(walletId)
    const sessionSeed = buildMultiplySessionSeed(walletId)

    writeMultiplySessionState(walletId, seededState)
    writeMultiplySessionMetadata(walletId, {
      transactionHistory: [
        {
          id: "history-1",
          intentId: "intent-1",
          walletId,
          marketId: "eth-usdt",
          kind: "multiply",
          status: "success",
          multiplierBefore: 1,
          multiplierAfter: 2,
          simulated: true,
          timestamp: seededState.now,
          hash: "sim_multiply_1",
        },
      ],
      receipts: [],
    })

    const { result } = renderHook(() =>
      useMultiplySession({
        walletId,
        sessionSeed,
      }),
    )

    expect(result.current.transactionHistory[0]?.hash).toBe("sim_multiply_1")
  })
})

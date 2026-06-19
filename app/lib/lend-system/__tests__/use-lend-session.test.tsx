import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { buildLendSessionSeed } from "@/app/lib/lend-system/demo-session"
import { writeLendSessionState } from "@/app/lib/lend-system/storage"
import { buildMockLendSystemStateWithSeedPosition } from "@/app/lib/lend-system/mock"
import { useLendSession } from "@/app/lib/lend-system/use-lend-session"

describe("useLendSession", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("hydrates persisted lend state and executes a simulated deposit", async () => {
    const walletId = "demo-wallet"
    const seededState = buildMockLendSystemStateWithSeedPosition(walletId)
    const sessionSeed = buildLendSessionSeed(walletId)

    writeLendSessionState(walletId, seededState)

    const { result } = renderHook(() =>
      useLendSession({
        walletId,
        sessionSeed,
      }),
    )

    expect(Object.keys(result.current.state.positions).length).toBeGreaterThan(0)

    await act(async () => {
      const intent = result.current.createIntent({
        type: "deposit",
        walletId,
        marketId: "gho",
        depositAmount: 500,
        walletBalance: 5000,
      })
      const preview = await result.current.previewTransaction(intent)
      expect(preview.allowed).toBe(true)
      await result.current.executeTransaction(intent)
    })

    expect(result.current.transactionHistory.length).toBeGreaterThan(0)
  })
})

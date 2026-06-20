import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { AvanaSessionsProvider, useAvanaSessions } from "@/app/lib/avana-session/avana-sessions-provider"

describe("Avana rewards bridge", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("turns successful lend, borrow, and multiply actions into live rewards progress", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AvanaSessionsProvider>{children}</AvanaSessionsProvider>
    const { result } = renderHook(() => useAvanaSessions(), { wrapper })

    await act(async () => {
      const borrowMarketId = result.current.borrow.collateralPools[0]!.id
      const borrowAssetId = result.current.borrow.getBorrowableAssetsForMarket(borrowMarketId)[0]!.id

      const lendIntent = result.current.lend.createIntent({
        type: "deposit",
        walletId: result.current.walletId,
        marketId: "gho",
        depositAmount: 6_000,
        walletBalance: 10_000,
      })
      await result.current.lend.executeTransaction(lendIntent)

      const borrowIntent = result.current.borrow.createIntent({
        type: "borrow",
        walletId: result.current.walletId,
        marketId: borrowMarketId,
        assetId: borrowAssetId,
        amountUsd6: 2_500_000_000n,
        at: Date.now(),
      })
      await result.current.borrow.executeTransaction(borrowIntent)

      const multiplyIntent = result.current.multiply.createIntent({
        type: "multiply",
        walletId: result.current.walletId,
        marketId: "eth-usdt",
        depositAmountUsd: 3_000,
        targetMultiplier: 2.4,
      })
      await result.current.multiply.executeTransaction(multiplyIntent)
    })

    await waitFor(async () => {
      const progress = await result.current.rewards.readAdapter.readProgress(result.current.walletId)
      expect(progress.find((item) => item.taskId === "first-lend-deposit")?.status).toBe("claimable")
      expect(progress.find((item) => item.taskId === "first-borrow")?.status).toBe("claimable")
      expect(progress.find((item) => item.taskId === "first-multiply")?.status).toBe("claimable")
    })
  })
})

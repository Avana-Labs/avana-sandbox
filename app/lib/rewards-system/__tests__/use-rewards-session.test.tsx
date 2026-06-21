import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { buildRewardsSessionSeed } from "@/app/lib/rewards-system"
import { useRewardsSession } from "@/app/lib/rewards-system/use-rewards-session"

describe("useRewardsSession", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("hydrates the wallet-scoped rewards session, tracks progress, and claims rewards", async () => {
    const walletId = "demo-wallet"

    const { result } = renderHook(() =>
      useRewardsSession({
        walletId,
        sessionSeed: buildRewardsSessionSeed(),
      }),
    )

    await waitFor(async () => {
      const progress = await result.current.readAdapter.readProgress(walletId)
      expect(progress.find((item) => item.taskId === "connect-wallet")?.status).toBe("claimable")
    })

    await act(async () => {
      await result.current.recordActivityEvent({
        id: "borrow-opened",
        wallet: walletId,
        product: "borrow",
        type: "borrow_opened",
        amountUsd: 2_500,
        timestamp: Date.UTC(2026, 5, 19),
      })
    })

    await waitFor(async () => {
      const progress = await result.current.readAdapter.readProgress(walletId)
      expect(progress.find((item) => item.taskId === "first-borrow")?.status).toBe("claimable")
    })

    await act(async () => {
      await result.current.claimReward("first-borrow")
    })

    await waitFor(async () => {
      const summary = await result.current.readAdapter.readRewardSummary(walletId)
      expect(summary.totalClaimedAmount).toBe(50)
    })
  })
})

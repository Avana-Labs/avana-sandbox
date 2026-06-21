import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useBorrowPageLive } from "@/app/borrow/use-borrow-page-live"

describe("useBorrowPageLive", () => {
  it("re-reads borrow page data when borrow session state changes", async () => {
    const readBorrowPage = vi
      .fn()
      .mockResolvedValueOnce({
        walletId: "demo-wallet",
        heroMetrics: {
          totalTvlUsd: 100_000_000,
          totalCollateralUsd: 80_000_000,
          availableCreditUsd: 20_000_000,
          outstandingLoansUsd: 40_000_000,
          totalTvlChangePct: 1.2,
        },
      })
      .mockResolvedValueOnce({
        walletId: "demo-wallet",
        heroMetrics: {
          totalTvlUsd: 102_000_000,
          totalCollateralUsd: 82_000_000,
          availableCreditUsd: 18_000_000,
          outstandingLoansUsd: 42_000_000,
          totalTvlChangePct: 1.4,
        },
      })

    const borrowSession = {
      walletId: "demo-wallet",
      readAdapter: { readBorrowPage },
      state: { accounts: {}, markets: {}, assets: {} },
      transactionHistory: [] as unknown[],
    }

    const { result, rerender } = renderHook(
      ({ session }) => useBorrowPageLive("demo-wallet", session as never),
      { initialProps: { session: borrowSession } },
    )

    await waitFor(() => expect(result.current?.heroMetrics.totalCollateralUsd).toBe(80_000_000))
    expect(readBorrowPage).toHaveBeenCalledTimes(1)

    rerender({
      session: {
        ...borrowSession,
        transactionHistory: [{ id: "tx-1" }],
      },
    })

    await waitFor(() => expect(result.current?.heroMetrics.totalCollateralUsd).toBe(82_000_000))
    expect(readBorrowPage).toHaveBeenCalledTimes(2)
  })
})

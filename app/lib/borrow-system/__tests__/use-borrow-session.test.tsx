import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { buildBorrowSessionSeed } from "@/app/lib/borrow-system/demo-session"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"

describe("useBorrowSession", () => {
  it("hydrates from the canonical seed and persists adapter-driven deposit updates", async () => {
    const walletId = "demo-wallet"
    const seeded = buildMockBorrowSystemState(walletId)
    const { result } = renderHook(() =>
      useBorrowSession({
        walletId,
        sessionSeed: buildBorrowSessionSeed(walletId),
      }),
    )

    const initialCollateral = result.current.walletSnapshot.totalCollateralUsd

    await act(async () => {
      const transaction = await result.current.executeTransaction(
        result.current.createIntent({
          type: "supplyCollateral",
          walletId,
          marketId: "uni-v3-bluechip-weth-usdc",
          amountUsd6: parseFixed("500", 6),
          at: seeded.now + 1000,
        }),
      )

      expect(transaction.receipt.simulated).toBe(true)
    })

    expect(result.current.walletSnapshot.totalCollateralUsd).toBeGreaterThan(initialCollateral)
    expect(result.current.marketSummaries.find((market) => market.id === "uni-v3-bluechip-weth-usdc")?.collateralExampleUsd).toBeGreaterThan(0)
  })

  it("keeps borrow updates visible through the same wallet-scoped session", async () => {
    const walletId = "demo-wallet"
    const seeded = buildMockBorrowSystemState(walletId)
    const { result } = renderHook(() =>
      useBorrowSession({
        walletId,
        sessionSeed: buildBorrowSessionSeed(walletId),
      }),
    )

    const initialDebt = result.current.initialDebts["uni-v3-bluechip-weth-usdc"] ?? 0

    await act(async () => {
      const preview = await result.current.previewTransaction(
        result.current.createIntent({
          type: "borrow",
          walletId,
          marketId: "uni-v3-bluechip-weth-usdc",
          assetId: "uni-v3-bluechip:usdc",
          amountUsd6: parseFixed("250", 6),
          at: seeded.now + 2000,
        }),
      )

      expect(preview.allowed).toBe(true)
      await result.current.executeTransaction(preview.intent)
    })

    expect(result.current.initialDebts["uni-v3-bluechip-weth-usdc"]).toBeGreaterThan(initialDebt)
    expect(result.current.walletSnapshot.totalBorrowedUsd).toBeGreaterThan(2000)
  })

  it("does not mutate session state when previewing an invalid transaction", async () => {
    const walletId = "demo-wallet"
    const { result } = renderHook(() =>
      useBorrowSession({
        walletId,
        sessionSeed: buildBorrowSessionSeed(walletId),
      }),
    )

    const initialDebt = result.current.walletSnapshot.totalBorrowedUsd

    await act(async () => {
      const preview = await result.current.previewTransaction(
        result.current.createIntent({
          type: "borrow",
          walletId,
          marketId: "uni-v3-bluechip-weth-usdc",
          assetId: "uni-v3-bluechip:usdc",
          amountUsd6: parseFixed("50000", 6),
        }),
      )

      expect(preview.allowed).toBe(false)
      expect(preview.validationErrors.length).toBeGreaterThan(0)
    })

    expect(result.current.walletSnapshot.totalBorrowedUsd).toBe(initialDebt)
  })
})

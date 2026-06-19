import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { serializeBorrowSystemState } from "@/app/lib/borrow-system/codec"
import { buildMockBorrowSystemState } from "@/app/lib/borrow-system/mock"
import { useBorrowSession } from "@/app/lib/borrow-system/use-borrow-session"

describe("useBorrowSession", () => {
  it("hydrates from the canonical seed and persists action updates", () => {
    const seeded = buildMockBorrowSystemState("demo-wallet")
    const { result } = renderHook(() =>
      useBorrowSession({
        walletId: "demo-wallet",
        sessionSeed: serializeBorrowSystemState(seeded),
      }),
    )

    const initialCollateral = result.current.walletSnapshot.totalCollateralUsd

    act(() => {
      result.current.dispatch({
        type: "supplyCollateral",
        walletId: "demo-wallet",
        marketId: "uni-v3-bluechip-weth-usdc",
        amountUsd6: parseFixed("500", 6),
        at: seeded.now + 1000,
      })
    })

    expect(result.current.walletSnapshot.totalCollateralUsd).toBeGreaterThan(initialCollateral)
    expect(result.current.marketSummaries.find((market) => market.id === "uni-v3-bluechip-weth-usdc")?.collateralExampleUsd).toBeGreaterThan(0)
  })
})

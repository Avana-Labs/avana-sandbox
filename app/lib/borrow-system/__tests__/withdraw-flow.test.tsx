import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createBorrowFlowHarness, parseFixed } from "./flow.harness"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"

describe("withdraw flow", () => {
  it("blocks unsafe withdraw in adapter preview", async () => {
    const harness = createBorrowFlowHarness()
    const { result } = renderHook(() => useBorrowActionBox(harness.session))

    await act(async () => {
      await result.current.prepareAction({
        type: "removeCollateral",
        walletId: "wallet-1",
        positionId: "wallet-1:weth-usdc",
        amountUsd6: parseFixed("10000", 6),
      })
    })

    expect(result.current.previewUi?.allowed).toBe(false)
    expect(result.current.previewUi?.blockedReason).toBeTruthy()
  })

  it("completes safe withdraw and reduces collateral", async () => {
    const harness = createBorrowFlowHarness()
    const collateralBefore = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares

    const { result } = renderHook(() => useBorrowActionBox(harness.session))

    await act(async () => {
      await result.current.prepareAction({
        type: "removeCollateral",
        walletId: "wallet-1",
        positionId: "wallet-1:weth-usdc",
        amountUsd6: parseFixed("500", 6),
      })
    })

    await act(async () => {
      await result.current.advance()
    })

    await act(async () => {
      result.current.setStage("approve")
    })

    await act(async () => {
      await result.current.advance()
    })

    const collateralAfter = harness.getState().accounts["wallet-1"]!.collateralPositions[0]!.collateralShares

    expect(result.current.stage).toBe("success")
    expect(collateralAfter).toBeLessThan(collateralBefore)
  })
})

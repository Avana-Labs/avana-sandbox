import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { useBorrowActionBox } from "@/app/lib/borrow-system/use-borrow-action-box"

describe("useBorrowActionBox", () => {
  it("prepares adapter preview and blocks review when preview is disallowed", async () => {
    const session = {
      createIntent: vi.fn((action) => ({ id: "intent-1", payload: action, actionType: "borrow", simulated: true })),
      previewTransaction: vi.fn(async () => ({
        allowed: false,
        validationErrors: ["blocked"],
        warnings: [],
        riskLabel: "danger",
        before: {
          collateralValueUsd6: 0n,
          borrowCapacityUsd6: 0n,
          availableBorrowCapacityUsd6: 0n,
          totalBorrowedUsd6: 0n,
          currentLtvWad: 0n,
          healthFactorWad: null,
        },
        after: {
          collateralValueUsd6: 0n,
          borrowCapacityUsd6: 0n,
          availableBorrowCapacityUsd6: 0n,
          totalBorrowedUsd6: 0n,
          currentLtvWad: 0n,
          healthFactorWad: null,
        },
        intent: { id: "intent-1" },
      })),
      executeTransaction: vi.fn(),
      isPending: false,
    }

    const { result } = renderHook(() => useBorrowActionBox(session))

    await act(async () => {
      await result.current.prepareAction({
        type: "borrow",
        walletId: "wallet-1",
        marketId: "market-1",
        assetId: "asset-1",
        amountUsd6: parseFixed("100", 6),
      })
    })

    expect(result.current.stage).toBe("preview")
    expect(result.current.previewUi?.allowed).toBe(false)

    await act(async () => {
      await result.current.advance()
    })

    expect(session.executeTransaction).not.toHaveBeenCalled()
  })

  it("executes once on approve and stores receipt success UI", async () => {
    const session = {
      createIntent: vi.fn((action) => ({ id: "intent-1", payload: action, actionType: "borrow", simulated: true })),
      previewTransaction: vi.fn(async (intent) => ({
        allowed: true,
        validationErrors: [],
        warnings: [],
        riskLabel: "safe",
        intent,
        before: {
          collateralValueUsd6: parseFixed("1000", 6),
          borrowCapacityUsd6: parseFixed("700", 6),
          availableBorrowCapacityUsd6: parseFixed("200", 6),
          totalBorrowedUsd6: parseFixed("500", 6),
          currentLtvWad: parseFixed("0.5", 18),
          healthFactorWad: parseFixed("2", 18),
        },
        after: {
          collateralValueUsd6: parseFixed("1000", 6),
          borrowCapacityUsd6: parseFixed("700", 6),
          availableBorrowCapacityUsd6: parseFixed("100", 6),
          totalBorrowedUsd6: parseFixed("600", 6),
          currentLtvWad: parseFixed("0.6", 18),
          healthFactorWad: parseFixed("1.7", 18),
        },
      })),
      executeTransaction: vi.fn(async (intent) => ({
        preview: await session.previewTransaction(intent),
        receipt: {
          id: "receipt-1",
          hash: "sim_abc",
          status: "success",
          actionType: "borrow",
          simulated: true,
          timestamp: Date.now(),
        },
        result: {
          id: "receipt-1",
          hash: "sim_abc",
          status: "success",
          actionType: "borrow",
          simulated: true,
          timestamp: Date.now(),
        },
        historyItem: {
          id: "history-1",
          intentId: intent.id,
          walletId: "wallet-1",
          kind: "borrow",
          status: "success",
          requestedAmountUsd6: parseFixed("100", 6),
          executedAmountUsd6: parseFixed("100", 6),
          simulated: true,
          timestamp: Date.now(),
          hash: "sim_abc",
        },
        state: null,
      })),
      isPending: false,
    }

    const { result } = renderHook(() => useBorrowActionBox(session))

    await act(async () => {
      await result.current.prepareAction({
        type: "borrow",
        walletId: "wallet-1",
        marketId: "market-1",
        assetId: "asset-1",
        amountUsd6: parseFixed("100", 6),
      })
    })

    act(() => {
      result.current.setStage("approve")
    })

    await act(async () => {
      await result.current.advance()
    })

    expect(session.executeTransaction).toHaveBeenCalledTimes(1)
    expect(result.current.stage).toBe("success")
    expect(result.current.successUi?.receipt.hash).toBe("sim_abc")
  })
})

import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { buildMultiplySessionSeed } from "@/app/lib/multiply-system/demo-session"
import { writeMultiplySessionMetadata, writeMultiplySessionState } from "@/app/lib/multiply-system/storage"
import { buildMockMultiplySystemStateWithSeedPosition } from "@/app/lib/multiply-system/mock"
import { useMultiplySession } from "@/app/lib/multiply-system/use-multiply-session"
import { deserializeMultiplySystemState } from "@/app/lib/multiply-system/codec"
import type {
  MultiplySandboxActionResult,
  MultiplyTransactionAdapter,
  MultiplyTransactionIntent,
} from "@/app/lib/multiply-system/contracts"

describe("useMultiplySession", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("removes the legacy ghost position before a fresh-wallet multiply", async () => {
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

    expect(Object.keys(result.current.state.positions)).toHaveLength(0)

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

    expect(Object.keys(result.current.state.positions)).toHaveLength(1)
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
          amountUsd: 500,
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

  it("derives multiplierAfter from the transaction's position, not its tx id (issue #142)", () => {
    const walletId = "demo-wallet"
    const sessionSeed = buildMultiplySessionSeed(walletId)
    const { result } = renderHook(() => useMultiplySession({ walletId, sessionSeed, persistState: false }))

    act(() => {
      result.current.hydrateWalletData({
        positions: [
          {
            _id: "pos-1",
            product: "multiply",
            marketSlug: "eth-usdt",
            status: "open",
            collateralAmount: 500,
            collateralValueUsd: 1000,
            debtValueUsd: 500,
            multiplier: 2.5,
            openedAt: 1,
            lastUpdatedAt: 1,
          },
        ],
        transactions: [
          {
            _id: "tx-1",
            product: "multiply",
            kind: "multiply",
            status: "success",
            marketSlug: "eth-usdt",
            positionId: "pos-1",
            amountUsd: 500,
            syntheticTxHash: "sim_multiply_pos1",
            simulated: true,
            at: 1,
          },
        ],
      })
    })

    // The tx id ("tx-1") never equals the position id ("pos-1"); the prior code looked up
    // positions[tx._id] and always fell back to 1. Now it resolves via positionId.
    const item = result.current.transactionHistory.find((h) => h.hash === "sim_multiply_pos1")
    expect(item?.multiplierAfter).toBe(2.5)
  })

  it("exposes a real isPending signal during execution (issue #142)", async () => {
    const walletId = "demo-wallet"
    const sessionSeed = buildMultiplySessionSeed(walletId)

    // A deferred adapter keeps the execution promise open so the pending render is
    // observable (the real sandbox adapter resolves synchronously).
    let resolveExecute: (result: MultiplySandboxActionResult) => void = () => {}
    const executeResult = {
      preview: {} as MultiplySandboxActionResult["preview"],
      receipt: {} as MultiplySandboxActionResult["receipt"],
      historyItem: {} as MultiplySandboxActionResult["historyItem"],
      state: deserialize(sessionSeed),
    } as MultiplySandboxActionResult
    const transactionAdapter: MultiplyTransactionAdapter = {
      mode: "sandbox",
      createIntent: () => ({ intentId: "intent-pending" }) as unknown as MultiplyTransactionIntent,
      previewTransaction: async () => ({ allowed: true }) as never,
      executeTransaction: () => new Promise((resolve) => (resolveExecute = resolve)),
    }

    const { result } = renderHook(() =>
      useMultiplySession({ walletId, sessionSeed, transactionAdapter }),
    )
    expect(result.current.isPending).toBe(false)

    act(() => {
      void result.current.executeTransaction(result.current.createIntent({
        type: "multiply",
        walletId,
        marketId: "usdc-gho",
        collateralAmount: 500,
        selectedMultiplier: 2,
      }))
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))

    await act(async () => {
      resolveExecute(executeResult)
    })

    await waitFor(() => expect(result.current.isPending).toBe(false))
  })
})

function deserialize(seed: string) {
  // Local helper: the seed round-trips through the codec so the resolved execute result
  // carries a valid state shape without depending on adapter internals.
  return deserializeMultiplySystemState(seed)
}

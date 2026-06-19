import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { applyBorrowAction, parseFixed } from "@/app/lib/credit-engine"
import { makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"
import { BorrowModal, type BorrowModalContext } from "@/app/borrow/components/borrow-modal"
import { buildHomeBorrowPreview } from "@/app/lib/borrow-system/modal-preview-runtime"

const walletId = "wallet-1"

const poolVisual = { symbol: "WETH", shortLabel: "WETH", bgClassName: "bg-black", textClassName: "text-white" }
const stableVisual = { symbol: "USDC", shortLabel: "USDC", bgClassName: "bg-blue-500", textClassName: "text-white" }

const context: BorrowModalContext = {
  pool: {
    id: "uni-v3-bluechip-weth-usdc",
    name: "WETH / USDC",
    venue: "Uniswap",
    category: "0.05%",
    collateralUsd: 12000,
    maxLtv: 70,
    borrowPowerUsd: 8400,
    liquidationUsd: 9000,
    pairApr: 3.1,
    visuals: [poolVisual, stableVisual] as const,
  },
  currentDebtUsd: 4200,
  defaultTokenId: "uni-v3-bluechip:usdc",
  tokenOptions: [
    {
      id: "uni-v3-bluechip:usdc",
      name: "USD Coin",
      symbol: "USDC",
      subtitle: "Stablecoin",
      borrowApr: 4.2,
      visual: stableVisual,
    },
  ],
}

describe("BorrowModal", () => {
  let state = makeExampleBorrowSystemState()

  it("builds a valid adapter preview for the modal fixture", () => {
    const preview = buildHomeBorrowPreview(state, walletId, context.pool.id, context.tokenOptions![0]!.id, 300)
    expect(preview.isValid).toBe(true)
  })

  const borrowSession = {
    get state() {
      return state
    },
    createIntent: vi.fn((action) => ({ id: "intent-borrow", payload: action, actionType: "borrow", simulated: true })),
    previewTransaction: vi.fn(async (intent) => ({
      allowed: true,
      validationErrors: [],
      warnings: [],
      riskLabel: "safe" as const,
      intent,
      before: {
        collateralValueUsd6: parseFixed("10000", 6),
        borrowCapacityUsd6: parseFixed("7000", 6),
        availableBorrowCapacityUsd6: parseFixed("2800", 6),
        totalBorrowedUsd6: parseFixed("4200", 6),
        currentLtvWad: parseFixed("0.42", 18),
        healthFactorWad: parseFixed("2", 18),
      },
      after: {
        collateralValueUsd6: parseFixed("10000", 6),
        borrowCapacityUsd6: parseFixed("7000", 6),
        availableBorrowCapacityUsd6: parseFixed("2500", 6),
        totalBorrowedUsd6: parseFixed("4500", 6),
        currentLtvWad: parseFixed("0.45", 18),
        healthFactorWad: parseFixed("1.9", 18),
      },
    })),
    executeTransaction: vi.fn(async (intent) => {
      state = applyBorrowAction(state, { ...intent.payload, at: Date.now() })
      return {
        preview: await borrowSession.previewTransaction(intent),
        receipt: {
          id: "receipt-1",
          hash: "sim_borrow_1",
          status: "success" as const,
          actionType: "borrow" as const,
          simulated: true,
          timestamp: Date.now(),
        },
        result: {
          id: "receipt-1",
          hash: "sim_borrow_1",
          status: "success" as const,
          actionType: "borrow" as const,
          simulated: true,
          timestamp: Date.now(),
        },
        historyItem: {
          id: "history-1",
          kind: "borrow" as const,
          hash: "sim_borrow_1",
          simulated: true,
        },
        state,
      }
    }),
    isPending: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    state = makeExampleBorrowSystemState()
  })

  it("uses adapter preview metrics instead of pool liquidation ratio math", async () => {
    render(
      <BorrowModal
        open
        context={context}
        borrowSession={borrowSession}
        walletId={walletId}
        initialAmount="300"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )

    const reviewButton = screen.getByRole("button", { name: "Review borrow" })
    expect(reviewButton).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(reviewButton)
    })

    await waitFor(() => expect(borrowSession.createIntent).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText("Borrow now")).toBeInTheDocument())
    expect(screen.getByText(/Health factor/i)).toBeInTheDocument()
    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
  })

  it("executes through adapter and shows synthetic receipt hash", async () => {
    const onConfirm = vi.fn()

    render(
      <BorrowModal
        open
        context={context}
        borrowSession={borrowSession}
        walletId={walletId}
        initialAmount="300"
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText("Review borrow"))
    })

    await waitFor(() => expect(screen.getByText("Borrow now")).toBeInTheDocument())
    fireEvent.click(screen.getByText("Borrow now"))

    await waitFor(() => expect(screen.getByText("Approve wallet")).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText("Approve wallet"))
    })

    await waitFor(() => expect(borrowSession.executeTransaction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText("sim_borrow_1")).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByText("Done"))
    })

    expect(onConfirm).toHaveBeenCalled()
  })
})

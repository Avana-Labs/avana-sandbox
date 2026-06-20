import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { buildMultiplyPageData } from "@/app/lib/multiply-system/read-model"
import { makeExampleMultiplySystemState } from "@/app/lib/multiply-engine/__tests__/fixtures"
import { MultiplyClient } from "@/app/multiply/multiply-client"

const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicExploreTable(props: { rows: Array<{ href: string }>; onOpenMultiply: (href: string) => void }) {
      return (
        <button type="button" onClick={() => props.onOpenMultiply(props.rows[0]!.href)}>
          open-multiply-modal
        </button>
      )
    },
}))

vi.mock("@/app/lib/multiply-system/multiply-session-context", () => ({
  useMultiplySessionContext: () => ({
    walletId: "wallet-1",
    createIntent,
    previewTransaction,
    executeTransaction,
    isPending: false,
  }),
}))

vi.mock("@/app/multiply/components/multiply-hero", () => ({
  MultiplyHero: () => <div>multiply-hero</div>,
}))

describe("MultiplyClient modal flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const state = makeExampleMultiplySystemState()
    const market = state.markets["eth-usdt"]!
    const preview = {
      intent: {
        id: "intent-1",
        actionType: "multiply" as const,
        walletId: "wallet-1",
        marketId: market.id,
        requestedAt: state.now,
        simulated: true,
      },
      allowed: true,
      warnings: [],
      validationErrors: [],
      riskLabel: "safe" as const,
      before: {
        collateralValueUsd: 0,
        debtValueUsd: 0,
        multiplier: 1,
        ltv: 0,
        healthFactor: "infinity" as const,
        netApy: 0.03,
      },
      after: {
        collateralValueUsd: 3600,
        debtValueUsd: 1800,
        multiplier: 2,
        ltv: 0.5,
        healthFactor: 1.72,
        netApy: 0.081,
      },
      simulationSummary: {
        liquidationPrice: 1950,
        priceImpactPct: 0.002,
        maxLeverageApy: 0.09,
      },
    }

    createIntent.mockReturnValue({
      ...preview.intent,
      payload: {
        type: "multiply",
        walletId: "wallet-1",
        marketId: market.id,
        collateralAmount: 1,
        selectedMultiplier: 2,
      },
    })
    previewTransaction.mockResolvedValue(preview)
    executeTransaction.mockResolvedValue({
      preview,
      receipt: {
        id: "receipt-1",
        hash: "0xsimulated",
        status: "success" as const,
        actionType: "multiply" as const,
        simulated: true,
        timestamp: state.now,
      },
      historyItem: {
        id: "history-1",
        intentId: "intent-1",
        walletId: "wallet-1",
        marketId: market.id,
        kind: "multiply" as const,
        status: "success" as const,
        amountUsd: 3600,
        multiplierBefore: 1,
        multiplierAfter: 2,
        simulated: true,
        timestamp: state.now,
        hash: "0xsimulated",
      },
      state,
    })
  })

  it("opens the modal, previews, confirms, and closes after success", async () => {
    const pageData = buildMultiplyPageData("wallet-1")

    render(<MultiplyClient pageData={pageData} />)

    fireEvent.click(screen.getByText("open-multiply-modal"))
    expect(screen.getByText("Review simulated multiply")).toBeInTheDocument()

    fireEvent.click(screen.getByText("Review simulated multiply"))
    await waitFor(() => expect(previewTransaction).toHaveBeenCalled())
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByRole("button", { name: "Confirm simulated multiply" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Confirm simulated multiply" }))
    await waitFor(() => expect(executeTransaction).toHaveBeenCalled())
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Done" }))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument())
  })
})

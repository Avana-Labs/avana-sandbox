import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LiquidationPreviewPanel } from "@/app/borrow/components/liquidation-preview-panel"
import { EXAMPLE_WALLET_1_DEBT_ID, makeExampleBorrowSystemState } from "@/app/lib/credit-engine/__tests__/fixtures"

describe("browser liquidation preview", () => {
  it("renders preview-only liquidation panel with simulated labeling", () => {
    const state = makeExampleBorrowSystemState()
    state.accounts["wallet-1"]!.debtPositions[0]!.principalBorrowedUsd6 = 18_000_000_000n
    state.accounts["wallet-1"]!.debtPositions[0]!.debtSharesUsd6 = 18_000_000_000n

    render(
      <LiquidationPreviewPanel
        state={state}
        walletId="wallet-1"
        positionId="wallet-1:weth-usdc"
        debtPositionId={EXAMPLE_WALLET_1_DEBT_ID}
        amountUsd={2000}
      />,
    )

    expect(screen.getByText("Preview only")).toBeInTheDocument()
    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
  })
})

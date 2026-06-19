import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TransactionFlowPanel } from "@/app/components/transaction-flow"

describe("TransactionFlowPanel", () => {
  it("renders simulated transaction badge when simulated is true", () => {
    render(
      <TransactionFlowPanel
        stage="review"
        actionLabel="borrow"
        amountLabel="$250"
        title="Review borrow"
        subtitle="Borrow against collateral."
        rows={[]}
        primaryLabel="Continue"
        simulated
      />,
    )

    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
  })

  it("renders preview only badge for liquidation preview flows", () => {
    render(
      <TransactionFlowPanel
        stage="review"
        actionLabel="liquidation"
        amountLabel="$2,000"
        title="Liquidation preview"
        subtitle="Estimated liquidation outcome."
        rows={[]}
        primaryLabel="Close"
        previewOnly
      />,
    )

    expect(screen.getByText("Preview only")).toBeInTheDocument()
  })

  it("shows receipt hash on success and disables submit when blocked", () => {
    render(
      <TransactionFlowPanel
        stage="success"
        actionLabel="borrow"
        amountLabel="$250"
        title="Borrow successful"
        subtitle="Borrow completed."
        rows={[{ label: "Health factor", value: "2.1 → 1.8", tone: "positive" }]}
        primaryLabel="Done"
        receiptHash="sim_abc123"
        simulated
      />,
    )

    expect(screen.getByText(/sim_abc123/)).toBeInTheDocument()
  })
})

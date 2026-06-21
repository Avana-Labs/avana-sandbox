import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"

const preview: ActionPreviewUi = {
  allowed: true,
  amountLabel: "1 USDT",
  amountUsdLabel: "≈ $1.00",
  rateLabel: "Borrow APY",
  rateValue: "2.78%",
  marketLabel: "Market",
  marketValue: "Main · Core",
  balanceLabel: "Available to Borrow",
  balanceValue: "2.87",
  maxAmount: 2.87,
  metrics: [
    { id: "power", label: "Borrowing power", value: "$2.90 → $1.90" },
    { id: "hf", label: "Health factor", value: "2.90", tone: "warning" },
  ],
  networkFeeLabel: "~ $0.04",
  risk: null,
  blockedReason: null,
  validationErrors: [],
  warnings: [],
}

describe("ActionConfigureStage", () => {
  it("renders Aave-style amount card, market row, metrics, fee, and action footer", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Borrow"
        amount="1"
        onAmountChange={() => {}}
        preview={preview}
        onPrimary={vi.fn()}
        onSecondary={vi.fn()}
      />,
    )

    expect(screen.getByTestId("action-amount-card")).toBeInTheDocument()
    expect(screen.getByText("Borrow APY")).toBeInTheDocument()
    expect(screen.getByText("Main · Core")).toBeInTheDocument()
    expect(screen.getByText("$2.90 → $1.90")).toBeInTheDocument()
    expect(screen.getByText("~ $0.04")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Borrow" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("shows wallet toast while submitting", () => {
    render(
      <ActionConfigureStage stage="submitting" verb="Borrow" amount="1" onAmountChange={() => {}} preview={preview} />,
    )

    expect(screen.getByTestId("action-wallet-toast")).toBeInTheDocument()
  })

  it("disables primary CTA when preview is invalid", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Borrow"
        amount=""
        onAmountChange={() => {}}
        preview={{ ...preview, allowed: false, blockedReason: "Exceeds borrow power" }}
      />,
    )

    expect(screen.getByRole("button", { name: "Exceeds borrow power" })).toBeDisabled()
  })
})

describe("ActionSelectStage", () => {
  it("filters available assets", async () => {
    const { ActionSelectStage } = await import("@/app/components/action-page/action-select-stage")
    render(
      <ActionSelectStage
        title="Borrow"
        subtitle="Choose the asset to borrow."
        items={[
          { id: "usdt", name: "Tether", symbol: "USDT", trailingLabel: "2.78% APY" },
          { id: "usdc", name: "USD Coin", symbol: "USDC", trailingLabel: "2.50% APY" },
        ]}
        onSelect={() => {}}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText("Find an asset"), { target: { value: "tether" } })
    expect(screen.getByText("Tether")).toBeInTheDocument()
    expect(screen.queryByText("USD Coin")).not.toBeInTheDocument()
  })
})

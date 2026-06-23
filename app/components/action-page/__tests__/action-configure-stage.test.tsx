import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"

const preview: ActionPreviewUi = {
  allowed: true,
  amountLabel: "100 USDC",
  amountUsdLabel: "≈ $100.00",
  rateLabel: "Borrow APY",
  rateValue: "5.20%",
  marketLabel: "Market",
  marketValue: "USDC · Core",
  balanceLabel: "Available to Borrow",
  balanceValue: "$5,000.00",
  maxAmount: 5000,
  metrics: [{ id: "hf", label: "Health factor", value: "2.40 → 1.80" }],
  networkFeeLabel: "≈ $0.04",
  risk: null,
  blockedReason: null,
  validationErrors: [],
  warnings: [],
}

describe("ActionConfigureStage", () => {
  it("renders amount card, metrics, and footer", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Borrow"
        amount="100"
        onAmountChange={() => undefined}
        preview={preview}
        assetSymbol="USDC"
        onPrimary={() => undefined}
        secondaryHref="/borrow"
      />,
    )

    expect(screen.getByTestId("action-amount-card")).toBeInTheDocument()
    expect(screen.getByText("Health factor")).toBeInTheDocument()
    expect(screen.getByTestId("action-footer")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
  })

  it("shows percent shortcuts and receive WETH toggle when enabled", async () => {
    const user = userEvent.setup()
    const onPercent = vi.fn()

    render(
      <ActionConfigureStage
        stage="configure"
        verb="Withdraw"
        amount="25"
        onAmountChange={() => undefined}
        preview={preview}
        assetSymbol="WETH"
        showPercentShortcuts
        onPercent={onPercent}
        showReceiveWethToggle
        receiveWeth={false}
        onReceiveWethChange={() => undefined}
      />,
    )

    await user.click(screen.getByRole("button", { name: "50%" }))
    expect(onPercent).toHaveBeenCalledWith(50)
    expect(screen.getByRole("switch", { name: /receive weth/i })).toBeInTheDocument()
  })

  it("shows wallet toast during wallet_sign stage", () => {
    render(
      <ActionConfigureStage
        stage="wallet_sign"
        verb="Borrow"
        amount="100"
        onAmountChange={() => undefined}
        preview={preview}
      />,
    )

    expect(screen.getByTestId("action-wallet-toast")).toHaveTextContent("100 USDC")
  })

  it("can show an idle balance before preview data is available", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Deposit"
        amount=""
        onAmountChange={() => undefined}
        preview={null}
        assetSymbol="USDC"
        balanceLabel="Balance"
        balanceValue="8,200 USDC"
      />,
    )

    expect(screen.getByText("Balance: 8,200 USDC")).toBeInTheDocument()
  })

  it("can hide the amount card for target-only actions", () => {
    const { container } = render(
      <ActionConfigureStage
        stage="configure"
        verb="Deleverage"
        amount=""
        onAmountChange={() => undefined}
        preview={preview}
        multiplier="1.5"
        onMultiplierChange={() => undefined}
        multiplierOptions={[1.5, 2]}
        hideAmountInput
      />,
    )

    expect(within(container).queryByTestId("action-amount-card")).not.toBeInTheDocument()
    expect(within(container).getByRole("button", { name: "Review" })).toBeInTheDocument()
  })
})

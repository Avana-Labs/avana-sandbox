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
  metrics: [{ id: "hf", label: "Health factor", value: "2.40 → 1.80", after: "1.80" }],
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
    expect(screen.queryByRole("button", { name: "Max" })).not.toBeInTheDocument()
  })

  it("shows receive WETH toggle when enabled", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Withdraw"
        amount="25"
        onAmountChange={() => undefined}
        preview={preview}
        assetSymbol="WETH"
        showReceiveWethToggle
        receiveWeth={false}
        onReceiveWethChange={() => undefined}
      />,
    )

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

  it("renders leverage ruler when multiplier controls are provided", async () => {
    const onMultiplierChange = vi.fn()

    render(
      <ActionConfigureStage
        stage="configure"
        verb="Multiply"
        amount="1"
        onAmountChange={() => undefined}
        preview={preview}
        multiplier="2"
        onMultiplierChange={onMultiplierChange}
        multiplierMin={1}
        multiplierMax={5}
      />,
    )

    expect(await screen.findByTestId("action-leverage-ruler")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Max" }))
    expect(onMultiplierChange).toHaveBeenCalledWith("5")
  })
})

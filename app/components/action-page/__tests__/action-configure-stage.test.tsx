import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
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
  afterEach(() => {
    cleanup()
  })

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

  it("shows the balance and a Max button that fills the balance when showBalance is set", async () => {
    const onMax = vi.fn()
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Deposit"
        amount=""
        onAmountChange={() => undefined}
        preview={{ ...preview, balanceLabel: "Balance", balanceValue: "1.28 ETH" }}
        assetSymbol="ETH"
        showBalance
        onMax={onMax}
      />,
    )

    expect(screen.getByText(/1\.28 ETH/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Max" }))
    expect(onMax).toHaveBeenCalledTimes(1)
  })

  it("hides projected metrics for a blocked action and surfaces the block on the CTA", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Borrow"
        amount="100000"
        onAmountChange={() => undefined}
        preview={{
          ...preview,
          allowed: false,
          blockedReason: "This borrow exceeds your available credit.",
          // Engine returns after === before when blocked — a stale SAFE transition.
          metrics: [{ id: "hf", label: "Health factor", value: "2.40 → 2.40", before: "2.40", after: "2.40" }],
        }}
        assetSymbol="USDC"
        onPrimary={() => undefined}
      />,
    )

    // No misleading SAFE health-factor card / metrics block for a blocked action.
    expect(screen.queryByTestId("action-metrics-block")).not.toBeInTheDocument()
    expect(screen.queryByTestId("action-health-factor-card")).not.toBeInTheDocument()
    // The gate is the CTA itself: a disabled button with a short in-place reason.
    const cta = screen.getByRole("button", { name: "Try a smaller amount" })
    expect(cta).toBeInTheDocument()
    expect(cta).toBeDisabled()
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

  it("shows health factor bar in home layout configure stage", () => {
    render(
      <ActionConfigureStage
        stage="configure"
        verb="Multiply"
        amount=""
        onAmountChange={() => undefined}
        preview={preview}
        homeLayout
        hideAmountInput
        amountPlacement="stacked"
        multiplier="3"
        onMultiplierChange={() => undefined}
      />,
    )

    const card = screen.getByTestId("action-health-factor-card")
    expect(within(card).getByTestId("action-health-factor-bar")).toBeInTheDocument()
    expect(within(card).getByText("Health factor")).toBeInTheDocument()
    // Zone strip labels from the conservative 4-band scale (getAllByText since the active
    // band's label also appears in the status badge).
    expect(within(card).getAllByText("Watch").length).toBeGreaterThan(0)
    expect(within(card).getAllByText("At risk").length).toBeGreaterThan(0)
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

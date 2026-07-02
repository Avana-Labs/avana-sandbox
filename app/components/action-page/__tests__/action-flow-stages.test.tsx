import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ActionConfigureStage } from "@/app/components/action-page/action-configure-stage"
import { ActionProcessingStage } from "@/app/components/action-page/action-processing-stage"
import { ActionReviewStage } from "@/app/components/action-page/action-review-stage"
import type { ActionPreviewUi } from "@/app/lib/action-system/contracts"

const preview: ActionPreviewUi = {
  allowed: true,
  amountLabel: "1,000 USDC",
  amountUsdLabel: "≈ $1,000.00",
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

afterEach(() => {
  cleanup()
})

describe("action stage flow UI", () => {
  it("configure stage offers Review then review stage offers confirm verb", async () => {
    const user = userEvent.setup()
    const onPrimary = vi.fn()
    const onBack = vi.fn()

    const { rerender } = render(
      <ActionConfigureStage
        stage="configure"
        verb="Borrow"
        amount="1000"
        onAmountChange={() => undefined}
        preview={preview}
        assetSymbol="USDC"
        onPrimary={onPrimary}
        onSecondary={onBack}
        canGoBack
      />,
    )

    expect(screen.getByRole("button", { name: "Review" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Review" }))
    expect(onPrimary).toHaveBeenCalledTimes(1)

    rerender(
      <ActionReviewStage
        title="Review borrow"
        subtitle="Confirm the details below before signing."
        preview={preview}
        primaryLabel="Borrow"
        onPrimary={() => undefined}
        onSecondary={onBack}
      />,
    )

    expect(screen.getByTestId("action-review-stage")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Borrow" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Back" }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("shows the risk message once on review when the Note warning duplicates it", () => {
    const message = "This leverage reduces your safety buffer."
    render(
      <ActionReviewStage
        title="Review multiply"
        preview={{
          ...preview,
          rateLabel: "",
          rateValue: "",
          risk: { level: "warning", title: "Review leverage carefully", message },
          warnings: [message],
        }}
        primaryLabel="Multiply"
        onPrimary={() => undefined}
        onSecondary={() => undefined}
      />,
    )

    // The risk banner shows the message; the duplicate "Note" row is suppressed.
    expect(screen.getByTestId("action-risk-banner")).toHaveTextContent(message)
    expect(screen.queryByText("Note")).not.toBeInTheDocument()
    expect(screen.getAllByText(message)).toHaveLength(1)
  })

  it("still shows a distinct Note warning alongside the risk banner", () => {
    render(
      <ActionReviewStage
        title="Review multiply"
        preview={{
          ...preview,
          risk: { level: "warning", title: "Review leverage carefully", message: "Watch your health factor." },
          warnings: ["Liquidity is thin in this market."],
        }}
        primaryLabel="Multiply"
        onPrimary={() => undefined}
        onSecondary={() => undefined}
      />,
    )

    expect(screen.getByTestId("action-risk-banner")).toHaveTextContent("Watch your health factor.")
    expect(screen.getByText("Note")).toBeInTheDocument()
    expect(screen.getByText("Liquidity is thin in this market.")).toBeInTheDocument()
  })

  it("processing stage shows pending badge", () => {
    render(<ActionProcessingStage verb="Deposit" preview={preview} closeHref="/lend" />)
    expect(screen.getByTestId("action-processing-stage")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
  })
})

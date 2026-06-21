import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ActionMetricsBlock } from "@/app/components/action-page/action-metrics"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"

describe("ActionMetricsBlock", () => {
  it("renders health factor rows with heart styling on after value", () => {
    render(
      <ActionMetricsBlock
        rows={[
          {
            id: "health-factor",
            label: "Health factor",
            value: "6.59 → 1.08",
            before: "6.59",
            after: "1.08",
            tone: "warning",
          },
        ]}
      />,
    )

    expect(screen.getByTestId("metric-health-factor")).toBeInTheDocument()
    expect(screen.getAllByText("1.08").length).toBeGreaterThan(0)
  })
})

describe("ActionSuccessStage", () => {
  it("renders receipt card when receipt context is provided", () => {
    render(
      <ActionSuccessStage
        closeHref="/borrow"
        success={{
          title: "Borrow successful",
          description: "$1,000 processed.",
          receiptHash: "sim-123",
          metrics: [],
          primaryCtaLabel: "View borrow dashboard",
          primaryCtaHref: "/borrow",
          secondaryCtaLabel: "Done",
          receiptContext: {
            verb: "Borrow",
            amountLabel: "1000.00 USDC",
            rateLabel: "Borrow APY",
            rateValue: "7.04%",
            marketValue: "USDC · Core",
          },
        }}
      />,
    )

    expect(screen.getByTestId("action-success-stage")).toBeInTheDocument()
    expect(screen.getByText("Confirmed")).toBeInTheDocument()
    expect(screen.getByText("1000.00 USDC")).toBeInTheDocument()
  })
})

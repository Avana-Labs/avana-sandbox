import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ActionSuccessStage } from "@/app/components/action-page/action-success-stage"

describe("ActionSuccessStage", () => {
  it("renders receipt metrics and dashboard CTA", () => {
    render(
      <ActionSuccessStage
        success={{
          title: "Borrow successful",
          description: "$250.00 processed.",
          receiptHash: "0xabc123",
          metrics: [{ id: "hf", label: "Health factor", value: "2.10 → 1.95", tone: "positive" }],
          primaryCtaLabel: "View dashboard",
          primaryCtaHref: "/borrow",
          secondaryCtaLabel: "Close",
        }}
        onSecondary={vi.fn()}
      />,
    )

    expect(screen.getByTestId("action-success-stage")).toBeInTheDocument()
    expect(screen.getByText("Borrow successful")).toBeInTheDocument()
    expect(screen.getByText("0xabc123")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute("href", "/borrow")
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PortfolioLendingOpportunities } from "@/app/portfolio/portfolio-lending-opportunities"

describe("PortfolioLendingOpportunities", () => {
  it("threads the dashboard return target into the market CTA", () => {
    render(
      <PortfolioLendingOpportunities
        returnHref="/dashboard?tab=lending"
        buckets={[
          {
            title: "Stablecoins",
            apyRangeLabel: "4.2% - 5.1%",
            description: "Low-volatility deposits.",
            pools: [{ name: "USDC", apyPct: 4.8 }],
          },
        ]}
      />,
    )

    expect(screen.getByRole("link", { name: "View markets" })).toHaveAttribute(
      "href",
      "/actions/lend/deposit?return=%2Fdashboard%3Ftab%3Dlending",
    )
  })
})

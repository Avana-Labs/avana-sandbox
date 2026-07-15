import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { buildRangeData } from "@/app/components/charts"
import { DashboardHero } from "@/app/dashboard/dashboard-hero"

// Surface the format functions the hero hands the (dynamically imported) chart so the
// test can assert what the axis + tooltip would render under the mask.
vi.mock("@/app/components/charts/hero-chart-section", () => ({
  HeroChartSection: (props: { formatYAxis?: (v: number) => string; formatValue?: (v: number) => string }) => {
    const yAxis = props.formatYAxis ? props.formatYAxis(1234) : "default-axis"
    const value = props.formatValue ? props.formatValue(1234) : "default-value"
    return (
      <div>
        <div>chart-axis:{yAxis}</div>
        <div>chart-value:{value}</div>
      </div>
    )
  },
}))

vi.mock("@/app/components/display-preferences", () => ({
  useAmountDisplayPreferences: () => ({ showDollarAmounts: false }),
  useOptionalLocaleDisplayPreferences: () => ({ currency: "USD", language: "EN" }),
}))

vi.mock("@/app/portfolio/hero/portfolio-hero-header", () => ({
  PortfolioHeroHeader: () => <div>portfolio-hero-header</div>,
}))

vi.mock("@/app/portfolio/hero/portfolio-hero-actions", () => ({
  PortfolioHeroActions: () => <div>portfolio-hero-actions</div>,
}))

describe("DashboardHero privacy mask (lending tab)", () => {
  it("masks the chart axis/tooltip when dollar amounts are hidden", () => {
    render(
      <DashboardHero tab="lending" statOneValue="4.92%" statTwoValue="+$12.46" rangeData={buildRangeData(880, 14)} />,
    )

    // The lending hero no longer renders stat tiles or a balance headline, so the
    // raw stat value must never appear.
    expect(screen.queryByText("+$12.46")).not.toBeInTheDocument()

    // Chart axis ticks and tooltip values are masked, not real dollars.
    expect(screen.getByText("chart-axis:••")).toBeInTheDocument()
    expect(screen.getByText("chart-value:••••••••")).toBeInTheDocument()
  })
})

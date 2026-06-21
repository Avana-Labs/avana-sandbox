import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { buildRangeData } from "@/app/components/charts"
import { DashboardHero } from "@/app/dashboard/dashboard-hero"

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicChartSection() {
      return <div>hero-chart-section</div>
    },
}))

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({
    showDollarAmounts: true,
  }),
}))

vi.mock("@/app/portfolio/hero/portfolio-hero-header", () => ({
  PortfolioHeroHeader: () => <div>portfolio-hero-header</div>,
}))

vi.mock("@/app/portfolio/hero/portfolio-hero-actions", () => ({
  PortfolioHeroActions: () => <div>portfolio-hero-actions</div>,
}))

describe("DashboardHero", () => {
  it("renders the hero chart on the multiply tab", () => {
    render(
      <DashboardHero
        tab="looping"
        headlineValue="$12,000.00"
        headlineDelta="2.48 health factor"
        statOneValue="1"
        statTwoValue="8.75%"
        rangeData={buildRangeData(12_000, 240)}
        multiplySnapshot={{
          approvedUsd: 12_000,
          liquidationThresholdUsd: 10_200,
          totalBorrowedUsd: 4_950,
          totalCollateralUsd: 12_000,
          averageHealthFactor: 2.48,
          currentLtvPct: 41.25,
        }}
      />,
    )

    expect(screen.getByText("hero-chart-section")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("8.75%")).toBeInTheDocument()
  })
})

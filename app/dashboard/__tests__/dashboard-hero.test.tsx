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
  PortfolioHeroActions: ({ actions }: { actions: Array<{ href?: string }> }) => (
    <div>
      {actions.map((action, index) => (
        <div key={index}>{action.href ?? "no-href"}</div>
      ))}
    </div>
  ),
}))

describe("DashboardHero", () => {
  it("renders multiply health + stats on the looping tab without a price chart", () => {
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

    // The looping tab no longer renders the fake price/performance chart.
    expect(screen.queryByText("hero-chart-section")).not.toBeInTheDocument()
    // It surfaces the multiply stats and the real (non-synthetic) health factor.
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("8.75%")).toBeInTheDocument()
    expect(screen.getAllByText("2.48").length).toBeGreaterThan(0)
    expect(screen.queryByText("99.00")).not.toBeInTheDocument()
  })

  it("threads the current dashboard tab into quick action return urls", () => {
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

    expect(screen.getAllByText("/actions/multiply/multiply?return=%2Fdashboard%3Ftab%3Dlooping").length).toBeGreaterThan(0)
    expect(screen.getAllByText("/actions/multiply/deleverage?return=%2Fdashboard%3Ftab%3Dlooping").length).toBeGreaterThan(0)
  })

  it("pre-loads the user's actual position into Increase loop when a target exists", () => {
    render(
      <DashboardHero
        tab="looping"
        headlineValue="$12,000.00"
        headlineDelta="2.48 health factor"
        statOneValue="1"
        statTwoValue="8.75%"
        rangeData={buildRangeData(12_000, 240)}
        multiplyPositionTarget={{ marketId: "weeth-weth", multiplier: 2.5 }}
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

    // "Increase loop" targets the user's market and seeds the current leverage baseline.
    expect(
      screen.getAllByText(
        "/actions/multiply/multiply?market=weeth-weth&multiplier=2.5&return=%2Fdashboard%3Ftab%3Dlooping",
      ).length,
    ).toBeGreaterThan(0)
    // "Unwind loop" targets the same position's market.
    expect(
      screen.getAllByText(
        "/actions/multiply/deleverage?market=weeth-weth&return=%2Fdashboard%3Ftab%3Dlooping",
      ).length,
    ).toBeGreaterThan(0)
  })
})

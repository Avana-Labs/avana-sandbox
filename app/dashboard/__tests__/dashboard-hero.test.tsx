import { render, screen, within } from "@testing-library/react"
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
  useOptionalDisplayPreferences: () => ({
    showDollarAmounts: true,
    currency: "USD",
    language: "EN",
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

    // The looping tab no longer renders the fake price/performance chart.
    expect(screen.queryByText("hero-chart-section")).not.toBeInTheDocument()
    // It surfaces the multiply stats. (Credit Health / Borrowing Power cards now
    // render under the Looping Overview section, not in the hero.)
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("8.75%")).toBeInTheDocument()
    expect(screen.queryByText("Credit Health")).not.toBeInTheDocument()
  })

  it("hides fabricated credit-health / borrowing-power when there are no positions", () => {
    // Scope queries to this render's container — the suite has no global
    // afterEach(cleanup), so prior renders' DOM would otherwise leak in.
    const { container } = render(
      <DashboardHero
        tab="looping"
        headlineValue="$0.00"
        headlineDelta="— health factor"
        statOneValue="0"
        statTwoValue="0.00%"
        rangeData={buildRangeData(0, 0)}
        multiplyPositionTarget={null}
        multiplySnapshot={{
          approvedUsd: 0,
          liquidationThresholdUsd: 0,
          totalBorrowedUsd: 0,
          totalCollateralUsd: 0,
          averageHealthFactor: 2.45,
          currentLtvPct: 0,
        }}
      />,
    )
    const view = within(container)

    // No positions → no Credit Health / Borrowing Power cards, no fake "Safe"/"RISK".
    expect(view.queryByText("Credit Health")).not.toBeInTheDocument()
    expect(view.queryByText("Borrowing Power")).not.toBeInTheDocument()
    expect(view.queryByText("Safe")).not.toBeInTheDocument()
    expect(view.queryByText("RISK")).not.toBeInTheDocument()
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

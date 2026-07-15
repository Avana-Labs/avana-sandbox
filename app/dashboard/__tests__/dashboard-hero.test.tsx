import { render, within } from "@testing-library/react"
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
  useAmountDisplayPreferences: () => ({
    showDollarAmounts: true,
  }),
  useOptionalLocaleDisplayPreferences: () => ({
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
  it("renders a minimal looping hero — no chart, stats, or health cards", () => {
    // The looping hero is now just the header + tab strip. Balance/stats/actions
    // moved to the Looping Overview section; the Credit Health / Borrowing Power
    // cards render there too, not in the hero.
    const { container } = render(
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
    const view = within(container)

    expect(view.getByText("portfolio-hero-header")).toBeInTheDocument()
    expect(view.queryByText("hero-chart-section")).not.toBeInTheDocument()
    expect(view.queryByText("8.75%")).not.toBeInTheDocument()
    expect(view.queryByText("Credit Health")).not.toBeInTheDocument()
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
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { RewardsBalanceHero } from "@/app/dashboard/_rewards-components/rewards-balance-hero"
import type { ChartFeed } from "@/app/components/charts"

function liveFeed(value: number): ChartFeed {
  const points = [{ time: 0, value, label: "Now" }]
  return {
    headlineValue: `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    headlineDelta: "$0.00 (0.00%)",
    deltaTone: "positive",
    rangeData: { "1D": points, "1W": points, "1M": points, "3M": points, "1Y": points, All: points },
    valueFormat: "usdCompact",
  }
}

vi.mock("next/dynamic", () => ({
  default: () =>
    function Chart({ data }: { data?: Array<{ value: number }> }) {
      return <div data-testid="portfolio-chart">{(data ?? []).map((point) => point.value).join(",")}</div>
    },
}))

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

vi.mock("@/app/lib/currency/use-currency", () => ({
  useCurrency: () => ({ ctx: { currency: "USD", rate: 1 } }),
}))

describe("RewardsBalanceHero", () => {
  it("p0-04 uses the live portfolio value for the headline and chart", () => {
    render(
      <DisplayPreferencesProvider>
        <RewardsBalanceHero portfolioValueUsd={12_345.67} feed={liveFeed(12_345.67)} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByText("$12,345.67")).toBeInTheDocument()
    expect(screen.queryByText("$14,400.00")).not.toBeInTheDocument()
    expect(screen.queryByText("-$312.96 (-3.80%)")).not.toBeInTheDocument()
    expect(screen.getByTestId("portfolio-chart")).toHaveTextContent("12345.67")
    expect(screen.getByTestId("portfolio-chart")).not.toHaveTextContent("14400")
  })

  it("shows the Assets · Debt breakdown when provided", () => {
    render(
      <DisplayPreferencesProvider>
        <RewardsBalanceHero portfolioValueUsd={2_000} assetsUsd={2_400} debtUsd={400} feed={liveFeed(2_000)} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByText("$2,400.00")).toBeInTheDocument()
    expect(screen.getByText("$400.00")).toBeInTheDocument()
  })
})

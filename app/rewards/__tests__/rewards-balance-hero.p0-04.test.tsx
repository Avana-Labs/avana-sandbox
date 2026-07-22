import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"
import { RewardsBalanceHero } from "@/app/rewards/rewards-balance-hero"

vi.mock("next/dynamic", () => ({
  default: () =>
    function Chart({ data }: { data: Array<{ value: number }> }) {
      return <div data-testid="portfolio-chart">{data.map((point) => point.value).join(",")}</div>
    },
}))

vi.mock("@/app/lib/i18n/use-translation", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}))

describe("RewardsBalanceHero", () => {
  it("p0-04 uses the live portfolio value for the headline and chart", () => {
    render(
      <DisplayPreferencesProvider>
        <RewardsBalanceHero portfolioValueUsd={12_345.67} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByText("$12,345.67")).toBeInTheDocument()
    expect(screen.queryByText("$14,400.00")).not.toBeInTheDocument()
    expect(screen.queryByText("-$312.96 (-3.80%)")).not.toBeInTheDocument()
    expect(screen.getByTestId("portfolio-chart")).toHaveTextContent("12345.67")
    expect(screen.getByTestId("portfolio-chart")).not.toHaveTextContent("14400")
  })
})

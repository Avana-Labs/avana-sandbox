import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MarketHeroChart } from "../market-hero-chart"
import { setActiveCurrency } from "@/app/lib/currency/active-rate"
import type { ChartFeed } from "../types"

const currencyRef = { current: "USD" as string }

vi.mock("@/app/components/display-preferences", () => ({
  useOptionalLocaleDisplayPreferences: () => ({ currency: currencyRef.current, language: "EN" }),
}))

// The area chart / range selector are SVG-heavy and irrelevant to the headline
// conversion under test; stub them so the test isolates the resting headline.
vi.mock("../hero-area-chart", () => ({ HeroAreaChart: () => null }))
vi.mock("../chart-range-selector", () => ({ ChartRangeSelector: () => null }))

afterEach(cleanup)

const feed: ChartFeed = {
  headlineValue: "$312.4M",
  headlineDelta: "$1.0M (0.32%)",
  deltaTone: "positive",
  rangeData: {
    "1D": [{ time: 0, value: 312_400_000, label: "" }],
    "1W": [{ time: 0, value: 312_400_000, label: "" }],
    "1M": [{ time: 0, value: 312_400_000, label: "" }],
    "3M": [{ time: 0, value: 312_400_000, label: "" }],
    "1Y": [{ time: 0, value: 312_400_000, label: "" }],
    All: [{ time: 0, value: 312_400_000, label: "" }],
  },
  valueFormat: "usdCompact",
}

describe("MarketHeroChart headline currency conversion", () => {
  it("shows the frozen USD headline verbatim in USD", () => {
    currencyRef.current = "USD"
    setActiveCurrency("USD")
    const { getByText } = render(<MarketHeroChart feed={feed} />)
    expect(getByText("$312.4M")).toBeInTheDocument()
  })

  it("re-denominates the resting headline so it no longer mixes currencies with the delta", () => {
    currencyRef.current = "EUR"
    setActiveCurrency("EUR")
    const { getByText, queryByText } = render(<MarketHeroChart feed={feed} />)
    expect(getByText("€287.4M")).toBeInTheDocument()
    expect(queryByText("$312.4M")).toBeNull()
    setActiveCurrency("USD")
  })
})

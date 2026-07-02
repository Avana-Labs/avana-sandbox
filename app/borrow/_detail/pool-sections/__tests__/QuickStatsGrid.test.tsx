import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QuickStatsGrid } from "../QuickStatsGrid"

const currencyRef = { current: "USD" as string }

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ currency: currencyRef.current }),
}))

afterEach(cleanup)

const detail = {
  quickStats: [
    { id: "totalSupplied", label: "Total Supplied", value: "$312.4M" },
    { id: "utilization", label: "Utilization", value: "62.1%" },
  ],
}

describe("QuickStatsGrid currency conversion", () => {
  it("renders Market overview money stats in USD by default", () => {
    currencyRef.current = "USD"
    const { getByText } = render(<QuickStatsGrid detail={detail} />)
    expect(getByText("$312.4M")).toBeInTheDocument()
    // Non-money stats are never touched.
    expect(getByText("62.1%")).toBeInTheDocument()
  })

  it("re-denominates the money stat when the active currency is not USD", () => {
    currencyRef.current = "EUR"
    const { getByText, queryByText } = render(<QuickStatsGrid detail={detail} />)
    // $312.4M * 0.92 ≈ €287.4M — symbol and value both update.
    expect(getByText("€287.4M")).toBeInTheDocument()
    expect(queryByText("$312.4M")).toBeNull()
    // The percentage stat stays as-is (no mixed-currency artifact).
    expect(getByText("62.1%")).toBeInTheDocument()
  })
})

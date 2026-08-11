import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { QuickStatsGrid } from "../QuickStatsGrid"

const currencyRef = { current: "USD" as string }

vi.mock("@/app/components/display-preferences", () => ({
  useOptionalLocaleDisplayPreferences: () => ({
    currency: currencyRef.current,
    language: "EN",
  }),
}))

afterEach(cleanup)

const detail = {
  quickStats: [
    { id: "totalSupplied", label: "Total Supplied", value: "$312.4M" },
    { id: "utilization", label: "Utilization", value: "62.1%" },
  ],
}

describe("QuickStatsGrid currency conversion", () => {
  it("keeps supplied and borrow APY at the top of market stats", () => {
    render(
      <QuickStatsGrid
        detail={{
          quickStats: [
            { id: "utilization", label: "Utilization", value: "62.1%" },
            { id: "reserveFactor", label: "Reserve Factor", value: "10%" },
            { id: "borrowApy", label: "Borrow APY", value: "37.98%" },
            { id: "supplied", label: "Total Supplied", value: "$29.46M" },
          ],
        }}
      />,
    )

    const labels = screen
      .getAllByText(/Total Supplied|Borrow APY|Utilization|Reserve Factor/)
      .map((node) => node.textContent)
    expect(labels).toEqual(["Total Supplied", "Borrow APY", "Utilization", "Reserve Factor"])
  })

  it("renders Market overview money stats in USD by default", () => {
    currencyRef.current = "USD"
    const { getByText } = render(<QuickStatsGrid detail={detail} />)
    expect(getByText("$312.4M")).toBeInTheDocument()
    // Non-money stats are never touched.
    expect(getByText("62.1%")).toBeInTheDocument()
  })

  it("explains reserve metrics on hover", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const user = userEvent.setup()
    render(<QuickStatsGrid detail={detail} />)

    await user.hover(
      screen.getByRole("button", {
        name: "More information about Utilization",
      }),
    )
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Percentage of deposited assets currently being borrowed",
    )
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

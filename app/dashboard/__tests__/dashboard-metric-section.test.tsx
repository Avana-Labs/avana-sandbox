import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DashboardPerformanceSection } from "@/app/dashboard/dashboard-metric-section"

vi.mock("@/app/components/display-preferences", () => ({
  useAmountDisplayPreferences: () => ({ showDollarAmounts: true }),
  // useTranslation() reads this; t(key) === key so labels render in English.
  useOptionalLocaleDisplayPreferences: () => ({ language: "EN", currency: "USD" }),
}))

afterEach(() => cleanup())

describe("DashboardPerformanceSection", () => {
  it("surfaces interest owed on outstanding loans", () => {
    render(
      <DashboardPerformanceSection
        title="Borrow Performance"
        metrics={{
          poolCollateralUsd: 10_000,
          netApyPct: 3.2,
          interestEarnedUsd: 0,
          interestOwedUsd: 128.4,
        }}
      />,
    )

    expect(screen.getByText("Interest Owed")).toBeTruthy()
    // Exact currency formatting (>= 100 → no decimals) via the shared formatter.
    expect(screen.getByText("$128")).toBeTruthy()
  })
})

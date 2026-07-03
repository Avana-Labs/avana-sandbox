import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ showDollarAmounts: true }),
  useOptionalDisplayPreferences: () => ({ showDollarAmounts: true, currency: "USD", language: "EN" }),
}))

vi.mock("@/app/dashboard/components/borrow-tab/supplies-table", () => ({
  SuppliesHealthFactorCard: () => null,
  SuppliesPanel: ({ rows }: { rows: Array<{ remainingBorrowPowerUsd: number }> }) => (
    <div>remaining:{rows[0]?.remainingBorrowPowerUsd ?? 0}</div>
  ),
}))

vi.mock("@/app/dashboard/components/borrow-tab/debts-table", () => ({
  CurrentLtvCard: () => null,
  DebtsPanel: ({ rows }: { rows: Array<{ borrowedUsd: number }> }) => <div>borrowed:{rows[0]?.borrowedUsd ?? 0}</div>,
}))

const pool = {
  id: "pool-a",
  name: "Pool",
  venue: "Uni",
  category: "0.05%",
  collateralUsd: 1000,
  maxLtv: 70,
  borrowPowerUsd: 700,
  liquidationUsd: 800,
  pairApr: 3,
  visuals: [
    { symbol: "WETH", shortLabel: "W", bgClassName: "bg-black", textClassName: "text-white" },
    { symbol: "USDC", shortLabel: "U", bgClassName: "bg-blue-500", textClassName: "text-white" },
  ] as const,
}

describe("DashboardBorrowTab live rows", () => {
  it("renders refreshed debt amounts from updated props", () => {
    const { rerender } = render(
      <DashboardBorrowTab
        section="debts"
        debtPositions={[
          {
            id: "debt-a",
            pool,
            borrowedUsd: 50,
            liquidationThresholdUsd: 800,
            healthFactor: 2,
            borrowApr: 4,
            accruedInterestUsd: 0,
            dailyInterestUsd: 0,
          },
        ]}
      />,
    )

    expect(screen.getByText("borrowed:50")).toBeInTheDocument()

    rerender(
      <DashboardBorrowTab
        section="debts"
        debtPositions={[
          {
            id: "debt-a",
            pool,
            borrowedUsd: 300,
            liquidationThresholdUsd: 800,
            healthFactor: 1.7,
            borrowApr: 4,
            accruedInterestUsd: 0,
            dailyInterestUsd: 0,
          },
        ]}
      />,
    )

    expect(screen.getByText("borrowed:300")).toBeInTheDocument()
  })
})

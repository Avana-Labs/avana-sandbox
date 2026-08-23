import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DashboardCreditOverviewSection,
  DashboardLendPerformanceSection,
  DashboardMultiplyBalanceSection,
} from "@/app/dashboard/dashboard-metric-section"

vi.mock("@/app/components/display-preferences", () => ({
  useAmountDisplayPreferences: () => ({ showDollarAmounts: true }),
  useOptionalLocaleDisplayPreferences: () => ({ language: "EN", currency: "USD" }),
}))

afterEach(() => cleanup())

describe("Borrow Balance metric cards", () => {
  it("renders all eight wallet-level Borrow Balance metrics", () => {
    render(
      <DashboardCreditOverviewSection
        title="Borrow Balance"
        metrics={{
          netValueUsd: 12_000,
          collateralValueUsd: 20_000,
          totalBorrowedUsd: 8_000,
          availableToBorrowUsd: 4_500,
          healthFactor: 2.05,
          liquidationBufferUsd: 6_400,
          netApyPct: 3.25,
          interestOwedUsd: 42,
        }}
      />,
    )

    for (const label of [
      "Net Value",
      "Collateral Value",
      "Total Borrowed",
      "Available to Borrow",
      "Health Factor",
      "Liquidation Buffer",
      "Net APY",
      "Interest Owed",
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText("2.05")).toBeTruthy()
    expect(screen.getByText("3.25%")).toBeTruthy()
    expect(screen.queryByText("Total Collateral")).toBeNull()
  })
})

describe("Multiply Balance metric cards", () => {
  it("renders all eight wallet-level Multiply Balance metrics", () => {
    render(
      <DashboardMultiplyBalanceSection
        title="Multiply Balance"
        metrics={{
          netValueUsd: 10_000,
          positionValueUsd: 27_000,
          totalBorrowedUsd: 17_000,
          leverageX: 2.7,
          netApyPct: 8.73,
          healthFactor: 1.85,
          liquidationBufferUsd: 3_200,
          riskPremiumPct: 1.12,
        }}
      />,
    )

    for (const label of [
      "Net Value",
      "Position Value",
      "Total Borrowed",
      "Leverage",
      "Net APY",
      "Health Factor",
      "Liquidation Buffer",
      "Risk Premium",
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText("2.70×")).toBeTruthy()
    expect(screen.getByText("1.85")).toBeTruthy()
  })
})

describe("Lend Balance metric cards", () => {
  it("renders eight growth metrics and omits Rewards Earned", () => {
    render(
      <DashboardLendPerformanceSection
        title="Lend Balance"
        metrics={{
          totalSuppliedUsd: 100_000,
          netApyPct: 6.5,
          interestEarnedUsd: 2_500,
          yieldGeneratedPct: 2.56,
          projectedEarnings1dUsd: 17.81,
          projectedEarnings30dUsd: 534.25,
          projectedEarnings90dUsd: 1_602.74,
          projectedEarnings6mUsd: 3_250,
        }}
      />,
    )

    for (const label of [
      "Total Supplied",
      "Net APY",
      "Interest Earned",
      "Yield Generated",
      "1 Day",
      "30 Days",
      "90 Days",
      "6 Months",
    ]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText("6.50%")).toBeTruthy()
    expect(screen.getByText("2.56%")).toBeTruthy()
    expect(screen.queryByText("Rewards Earned")).toBeNull()
  })
})

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DashboardTabs } from "@/app/dashboard/dashboard-tabs"

const dashboardHeroSpy = vi.fn()

vi.mock("@/app/dashboard/dashboard-hero", () => ({
  DashboardHero: (props: Record<string, unknown>) => {
    dashboardHeroSpy(props)
    return <div>dashboard-hero</div>
  },
}))

describe("DashboardTabs", () => {
  it("uses the live multiply hero data on the looping tab", () => {
    render(
      <DashboardTabs
        activeTab="looping"
        onTabChange={() => {}}
        pageData={{
          walletProfile: { id: "wallet-1", walletAddress: "0x123" },
          fetchedAt: new Date().toISOString(),
          heroByTab: {
            overview: {},
            lending: {},
            looping: { headlineValue: "$111.00", statOneValue: "stale" },
            activity: {},
          },
          tabs: {
            borrow: { totalCollateralUsd: 0, totalDebtUsd: 0, availableToBorrowUsd: 0, averageHealthFactor: null },
            lend: { totalSuppliedUsd: 0, totalEarnedUsd: 0, averageApyPct: 0 },
            multiply: {},
            activity: { totalEvents: 0 },
          },
          borrow: {
            creditLines: {
              approvedUsd: 0,
              liquidationThresholdUsd: 0,
              averageHealthFactor: null,
              currentLtvPct: 0,
              totalBorrowedUsd: 0,
              totalCollateralUsd: 0,
            },
            collateralPositions: [],
            debtPositions: [],
          },
          lend: { investments: [], positions: [], strategyBuckets: [], history: [] },
          multiply: {
            creditLines: {
              approvedUsd: 0,
              liquidationThresholdUsd: 0,
              averageHealthFactor: null,
              currentLtvPct: 0,
              totalBorrowedUsd: 0,
              totalCollateralUsd: 0,
            },
            lpCollaterals: [],
            positions: [],
            openOrders: [],
            twapOrders: [],
            history: [],
          },
          activity: { rows: [] },
          rewards: { claimableUsd: 0, earnedUsd: 0, settledUsd: 0, pendingUsd: 0 },
        }}
        borrowSnapshot={{
          approvedUsd: 0,
          liquidationThresholdUsd: 0,
          totalBorrowedUsd: 0,
          totalCollateralUsd: 0,
          averageHealthFactor: null,
          currentLtvPct: 0,
        }}
        multiplySnapshot={{
          approvedUsd: 0,
          liquidationThresholdUsd: 0,
          totalBorrowedUsd: 0,
          totalCollateralUsd: 0,
          averageHealthFactor: null,
          currentLtvPct: 0,
        }}
        multiplyHero={{
          headlineValue: "$12,000.00",
          headlineDelta: "2.48 health factor",
          statOneValue: "1",
          statTwoValue: "8.75%",
        }}
      />,
    )

    expect(screen.getByText("dashboard-hero")).toBeInTheDocument()
    expect(dashboardHeroSpy).toHaveBeenCalled()
    expect(dashboardHeroSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      headlineValue: "$12,000.00",
      headlineDelta: "2.48 health factor",
      statOneValue: "1",
      statTwoValue: "8.75%",
    })
  })
})

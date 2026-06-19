import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PortfolioDashboard } from "@/app/portfolio/portfolio-dashboard"

const readPortfolioBorrow = vi.fn()

vi.mock("@/app/portfolio/use-portfolio-page", () => ({
  usePortfolioPage: ({ walletProfileId }: { walletProfileId: string }) => ({
    data: {
      walletProfile: {
        id: walletProfileId,
        walletAddress: "0x123",
        displayName: "Demo Wallet",
        selectedNetwork: "base",
        networks: ["base"],
      },
      heroByTab: {
        overview: {},
        lending: {},
        looping: {},
        activity: {},
      },
      tabs: {
        borrow: {
          totalCollateralUsd: 100,
          totalDebtUsd: 50,
          availableToBorrowUsd: 50,
          averageHealthFactor: 2.1,
        },
        lend: {
          totalSuppliedUsd: 0,
          totalEarnedUsd: 0,
          averageApyPct: 0,
        },
        multiply: {},
        activity: {
          totalEvents: 0,
        },
      },
      borrow: {
        creditLines: {
          approvedUsd: 100,
          liquidationThresholdUsd: 80,
          averageHealthFactor: 2.1,
          currentLtvPct: 40,
          totalBorrowedUsd: 50,
          totalCollateralUsd: 100,
        },
        collateralPositions: [],
        debtPositions: [],
      },
      lend: {
        investments: [],
        strategyBuckets: [],
      },
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
      activity: {
        rows: [],
      },
      rewards: {
        claimableUsd: 0,
        earnedUsd: 0,
        settledUsd: 0,
        pendingUsd: 0,
      },
      fetchedAt: new Date().toISOString(),
    },
  }),
}))

vi.mock("@/app/lib/borrow-system/use-borrow-session", () => ({
  useBorrowSession: () => ({
    readAdapter: {
      readPortfolioBorrow,
    },
  }),
}))

vi.mock("@/app/portfolio/portfolio-tabs", () => ({
  PortfolioTabs: ({ onTabChange }: { onTabChange: (tab: "overview") => void }) => (
    <button type="button" onClick={() => onTabChange("overview")}>
      Borrow tab
    </button>
  ),
}))

vi.mock("@/app/portfolio/credit-lines-card", () => ({
  CreditLinesCard: ({ creditLines }: { creditLines: { approvedUsd: number } }) => <div>approved:{creditLines.approvedUsd}</div>,
}))

vi.mock("@/app/portfolio/portfolio-positions", () => ({
  PortfolioPositions: ({
    collateralPositions,
    debtPositions,
  }: {
    collateralPositions: Array<{ pool: { id: string } }>
    debtPositions: Array<{ id: string }>
  }) => (
    <div>
      <div>collateral:{collateralPositions.map((position) => position.pool.id).join(",")}</div>
      <div>debt:{debtPositions.map((position) => position.id).join(",")}</div>
    </div>
  ),
}))

vi.mock("@/app/portfolio/portfolio-investments", () => ({
  PortfolioInvestments: () => <div>investments</div>,
}))

vi.mock("@/app/portfolio/recent-activity", () => ({
  RecentActivity: () => <div>activity</div>,
}))

vi.mock("@/app/portfolio/multiply-collateral-table", () => ({
  MultiplyCollateralTable: () => <div>multiply</div>,
}))

describe("PortfolioDashboard", () => {
  it("reads borrow credit lines and positions from the sandbox read adapter", async () => {
    readPortfolioBorrow.mockResolvedValue({
      creditLines: {
        approvedUsd: 999,
        liquidationThresholdUsd: 700,
        averageHealthFactor: 3.4,
        currentLtvPct: 22,
        totalBorrowedUsd: 220,
        totalCollateralUsd: 1000,
      },
      collateralPositions: [
        {
          pool: { id: "pool-a" },
          borrowedUsd: 0,
          remainingBorrowPowerUsd: 0,
          liquidationThresholdUsd: 0,
          healthFactor: null,
          pairApr: 0,
          feesUsd: 0,
        },
      ],
      debtPositions: [
        {
          id: "debt-a",
          pool: { id: "pool-a" },
          borrowedUsd: 220,
          liquidationThresholdUsd: 0,
          healthFactor: 3.4,
          borrowApr: 4.2,
          accruedInterestUsd: 0,
          dailyInterestUsd: 0,
        },
      ],
    })

    render(<PortfolioDashboard walletProfileId="demo-wallet" />)

    fireEvent.click(screen.getByText("Borrow tab"))

    await waitFor(() => expect(readPortfolioBorrow).toHaveBeenCalledWith("demo-wallet"))
    await waitFor(() => expect(screen.getByText("approved:999")).toBeInTheDocument())
    expect(screen.getByText("collateral:pool-a")).toBeInTheDocument()
    expect(screen.getByText("debt:debt-a")).toBeInTheDocument()
  })
})

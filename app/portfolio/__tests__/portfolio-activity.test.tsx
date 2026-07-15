import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { parseFixed } from "@/app/lib/credit-engine"
import { DashboardClient } from "@/app/dashboard/dashboard-client"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"

const readPortfolioBorrow = vi.fn()
const readPortfolioLend = vi.fn()
const readPortfolioMultiply = vi.fn()
let transactionHistory: Array<Record<string, unknown>> = []
let multiplyTransactionHistory: Array<Record<string, unknown>> = []

vi.mock("@/app/portfolio/use-portfolio-page", () => ({
  usePortfolioPage: ({ walletProfileId }: { walletProfileId: string }) => ({
    data: {
      walletProfile: { id: walletProfileId, walletAddress: "0x123", displayName: "Demo", selectedNetwork: "base", networks: ["base"] },
      heroByTab: { overview: {}, lending: {}, looping: {}, activity: {} },
      tabs: { borrow: {}, lend: {}, multiply: {}, activity: { totalEvents: 0 } },
      borrow: { creditLines: { approvedUsd: 0, liquidationThresholdUsd: 0, averageHealthFactor: null, currentLtvPct: 0, totalBorrowedUsd: 0, totalCollateralUsd: 0 }, collateralPositions: [], debtPositions: [] },
      lend: { investments: [], strategyBuckets: [] },
      multiply: { creditLines: { approvedUsd: 0, liquidationThresholdUsd: 0, averageHealthFactor: null, currentLtvPct: 0, totalBorrowedUsd: 0, totalCollateralUsd: 0 }, lpCollaterals: [], positions: [], openOrders: [], twapOrders: [], history: [] },
      activity: { rows: [] },
      rewards: { claimableUsd: 0, earnedUsd: 0, settledUsd: 0, pendingUsd: 0 },
      fetchedAt: new Date().toISOString(),
    },
  }),
}))

vi.mock("@/app/lib/avana-session/avana-sessions-provider", () => ({
  useAvanaIdentity: () => ({ walletId: "demo-wallet" }),
  useBorrowSessionContext: () => ({
    readAdapter: { readPortfolioBorrow },
    state: { now: Date.UTC(2026, 5, 19), markets: {}, assets: {}, accounts: {}, transactions: [] },
    get transactionHistory() {
      return transactionHistory
    },
  }),
  useMultiplySessionContext: () => ({
    readAdapter: { readPortfolioMultiply },
    state: { now: Date.UTC(2026, 5, 19), markets: {}, positions: {}, walletBalances: {}, transactions: [] },
    get transactionHistory() {
      return multiplyTransactionHistory
    },
  }),
  useLendSessionContext: () => ({
    walletId: "demo-wallet",
    readAdapter: { readPortfolioLend },
    state: { now: Date.UTC(2026, 5, 19), markets: {}, positions: {}, walletBalances: {}, transactions: [] },
    transactionHistory: [],
  }),
}))

vi.mock("@/app/lib/borrow-system/use-borrow-session", () => ({
  useBorrowSession: () => ({
    readAdapter: { readPortfolioBorrow },
    state: { now: Date.UTC(2026, 5, 19), markets: {}, assets: {}, accounts: {}, transactions: [] },
    get transactionHistory() {
      return transactionHistory
    },
  }),
}))

vi.mock("@/app/dashboard/dashboard-tabs", () => ({
  DashboardTabs: () => <div>dashboard-hero</div>,
}))

vi.mock("@/app/portfolio/dashboard-metric-section", () => ({
  DashboardOverviewSection: () => null,
  DashboardCreditOverviewSection: () => null,
  DashboardPerformanceSection: () => null,
  DashboardLendPerformanceSection: () => null,
}))
vi.mock("@/app/portfolio/dashboard-borrow-tab", () => ({ DashboardBorrowTab: () => null }))
vi.mock("@/app/portfolio/portfolio-investments", () => ({ PortfolioInvestments: () => null }))
vi.mock("@/app/portfolio/multiply-collateral-table", () => ({ MultiplyCollateralTable: () => null }))
vi.mock("@/app/portfolio/recent-activity", () => ({
  RecentActivity: ({ rows }: { rows: Array<{ txHash?: string; secondaryLabel?: string; amountUsd?: number }> }) => (
    <div>
      {rows.map((row) => (
        <div key={row.txHash}>
          <span>{row.txHash}</span>
          <span>{row.secondaryLabel}</span>
          <span>{row.amountUsd}</span>
        </div>
      ))}
    </div>
  ),
}))

describe("DashboardClient activity", () => {
  it("maps transactionHistory to activity rows with synthetic hash and simulated label", async () => {
    transactionHistory = [
      {
        id: "history-1",
        intentId: "intent-1",
        walletId: "demo-wallet",
        marketId: "uni-v3-bluechip-weth-usdc",
        assetId: "uni-v3-bluechip:usdc",
        kind: "borrow",
        status: "success",
        requestedAmountUsd6: parseFixed("250", 6),
        executedAmountUsd6: parseFixed("250", 6),
        simulated: true,
        timestamp: Date.UTC(2026, 5, 19),
        hash: "sim_abc123",
      },
    ]
    multiplyTransactionHistory = [
      {
        id: "multiply-1",
        intentId: "intent-multiply-1",
        walletId: "demo-wallet",
        marketId: "eth-usdc",
        kind: "multiply",
        status: "success",
        amountUsd: 1250,
        multiplierBefore: 1,
        multiplierAfter: 2.5,
        simulated: true,
        timestamp: Date.UTC(2026, 5, 19),
        hash: "0xmultiply",
      },
    ]

    readPortfolioBorrow.mockResolvedValue({
      creditLines: { approvedUsd: 100, liquidationThresholdUsd: 80, averageHealthFactor: 2, currentLtvPct: 40, totalBorrowedUsd: 50, totalCollateralUsd: 100 },
      collateralPositions: [],
      debtPositions: [],
    })
    readPortfolioLend.mockResolvedValue({
      investments: [],
      positions: [],
      strategyBuckets: [],
      history: [],
    })
    readPortfolioMultiply.mockResolvedValue({
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
    })

    render(
      <DisplayPreferencesProvider>
        <DashboardClient walletProfileId="demo-wallet" />
      </DisplayPreferencesProvider>,
    )

    await waitFor(() => expect(readPortfolioBorrow).toHaveBeenCalled())

    // Activity now renders inline on the dashboard (no separate tab to click).
    await waitFor(() => expect(screen.getByText("sim_abc123")).toBeInTheDocument())
    expect(screen.getByText("Simulated transaction")).toBeInTheDocument()
    expect(screen.getByText("0xmultiply")).toBeInTheDocument()
    expect(screen.getByText("1250")).toBeInTheDocument()
  })
})

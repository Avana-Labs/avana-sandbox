import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LendMarketDetailClient } from "@/app/lend/markets/[marketId]/market-detail-client"

vi.mock("@/app/lib/lend-system/lend-session-context", () => ({
  useLendSessionContext: () => ({
    walletId: "demo-wallet",
    state: {
      markets: {
        eth: {
          marketId: "eth",
          asset: { symbol: "ETH", name: "Ethereum" },
          supplyApy: 0.0411,
          rewardsApy: 0.01,
          totalApy: 0.0511,
          utilization: 0.5812,
          reserveFactor: 0.15,
          status: "active",
          availableLiquidity: 14900,
        },
      },
      positions: {
        "demo-wallet:eth": {
          walletId: "demo-wallet",
          marketId: "eth",
          status: "active",
          currentSuppliedAmount: 2.4,
          interestEarned: 0.08,
        },
      },
    },
    transactionHistory: [],
  }),
}))

vi.mock("@/app/lend/components/lend-market-action-dialog", () => ({
  LendMarketActionDialog: () => null,
}))

describe("LendMarketDetailClient", () => {
  it("renders live session market metrics instead of the catalog defaults", () => {
    render(<LendMarketDetailClient marketId="eth" />)

    expect(screen.getByText("5.11%")).toBeInTheDocument()
    expect(screen.getByText("58.12%")).toBeInTheDocument()
    expect(screen.getByText("2.4000")).toBeInTheDocument()
  })
})

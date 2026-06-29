import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LendMarketDetailClient } from "@/app/lend/markets/[marketId]/market-detail-client"

const pushMock = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

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

describe("LendMarketDetailClient", () => {
  afterEach(() => {
    cleanup()
    pushMock.mockClear()
  })

  it("renders live session market metrics instead of the catalog defaults", () => {
    render(<LendMarketDetailClient marketId="eth" />)

    expect(screen.getByText("5.11%")).toBeInTheDocument()
    expect(screen.getByText("58.12%")).toBeInTheDocument()
    expect(screen.getByText("2.4000")).toBeInTheDocument()
  })

  it("preserves the market detail as the return context for deposit and withdraw", () => {
    render(<LendMarketDetailClient marketId="eth" />)

    fireEvent.click(screen.getByRole("button", { name: "Deposit" }))
    expect(pushMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/actions/lend/deposit?market=eth&return=%2Flend%2Fmarkets%2Feth"),
    )

    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }))
    expect(pushMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/actions/lend/withdraw?market=eth&return=%2Flend%2Fmarkets%2Feth"),
    )
  })
})

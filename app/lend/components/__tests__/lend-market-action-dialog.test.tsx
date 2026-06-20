import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LendMarketActionDialog } from "@/app/lend/components/lend-market-action-dialog"

vi.mock("@/app/lib/lend-system/lend-session-context", () => ({
  useLendSessionContext: () => ({
    state: {
      markets: {
        eth: {
          marketId: "eth",
          asset: { symbol: "ETH", name: "Ethereum" },
          supplyApy: 0.0411,
          rewardsApy: 0.01,
          totalApy: 0.0511,
          utilization: 0.58,
          availableLiquidity: 14900,
          totalSupplied: 33000,
          reserveFactor: 0.15,
          status: "active",
        },
      },
    },
  }),
}))

vi.mock("@/app/lend/components/lend-action-box", () => ({
  LendActionBox: ({ market }: { market: { totalApy: number } }) => <div>{market.totalApy.toFixed(4)}</div>,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe("LendMarketActionDialog", () => {
  it("uses the live lend session market instead of the static catalog snapshot", () => {
    render(<LendMarketActionDialog open onOpenChange={vi.fn()} marketId="eth" initialAction="deposit" />)

    expect(screen.getByRole("heading", { name: "Deposit ETH" })).toBeInTheDocument()
    expect(screen.getByText("0.0511")).toBeInTheDocument()
  })
})

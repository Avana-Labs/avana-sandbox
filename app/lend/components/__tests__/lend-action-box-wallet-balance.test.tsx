import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LendActionBox } from "@/app/lend/components/lend-action-box"

const prepareAction = vi.fn()
const refreshPreview = vi.fn()

vi.mock("@/app/lib/lend-system/lend-session-context", () => ({
  useLendSessionContext: () => ({
    walletId: "demo-wallet",
    state: { positions: {} },
  }),
}))

vi.mock("@/app/lib/lend-system/use-lend-action-box", () => ({
  useLendActionBox: () => ({
    stage: "entry",
    intent: null,
    preview: null,
    canAdvance: false,
    prepareAction,
    refreshPreview,
    advance: vi.fn(),
    reset: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("@/app/lib/lend-system/wallet-balances", () => ({
  getWalletBalanceForLendMarket: () => 1.5,
}))

describe("LendActionBox wallet gating", () => {
  it("uses the wallet-specific asset balance when preparing a deposit", async () => {
    render(
      <LendActionBox
        market={
          {
            marketId: "eth",
            asset: { symbol: "ETH" },
            supplyApy: 0.0382,
            rewardsApy: 0,
            totalApy: 0.0382,
            utilization: 0.61,
          } as never
        }
      />,
    )

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: "Review simulated deposit" }))

    expect(prepareAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "deposit",
        walletBalance: 1.5,
      }),
    )
  })
})

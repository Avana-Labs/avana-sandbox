import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"
import { DisplayPreferencesProvider } from "@/app/components/display-preferences"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

const rows: PortfolioMultiplyCollateral[] = [
  {
    id: "demo-wallet:eth-usdt",
    marketId: "eth-usdt",
    label: "ETH/USDT",
    collateralToken: "ETH",
    borrowableToken: "USDT",
    multiplier: 2,
    protocol: "Avana Multiply",
    healthFactor: 1.45,
    collateralUsd: 7000,
    borrowPowerUsd: 3500,
    debtUsd: 3500,
    ltvPct: 50,
    liquidationPriceUsd: 2100,
    netApyPct: 3.2,
    status: "open",
  },
]

describe("MultiplyCollateralTable", () => {
  it("routes desktop deleverage to the multiply action page", () => {
    push.mockClear()
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={rows} />
      </DisplayPreferencesProvider>,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "Deleverage" })[0]!)
    expect(push).toHaveBeenCalledWith(
      actionPagePath("multiply", "deleverage", {
        market: "eth-usdt",
        return: "/multiply/markets/eth-usdt",
      }),
    )
  })
})

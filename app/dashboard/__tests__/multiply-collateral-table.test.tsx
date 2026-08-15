import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { actionPagePath } from "@/app/lib/action-system/contracts"
import { MultiplyCollateralTable } from "@/app/dashboard/multiply-collateral-table"
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

const ghostRows: PortfolioMultiplyCollateral[] = [
  {
    id: "demo-wallet:aave-gho",
    marketId: "aave-gho",
    label: "AAVE/GHO",
    collateralToken: "AAVE",
    borrowableToken: "GHO",
    multiplier: 1,
    protocol: "Avana Multiply",
    healthFactor: Number.POSITIVE_INFINITY,
    collateralUsd: 0,
    borrowPowerUsd: 0,
    debtUsd: 0,
    ltvPct: 0,
    liquidationPriceUsd: null,
    netApyPct: 0,
    status: "open",
  },
]

describe("MultiplyCollateralTable", () => {
  afterEach(() => {
    cleanup()
  })

  it("hides zero-exposure ghost positions and shows a clean empty state", () => {
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={ghostRows} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByText("No active Multiply positions")).toBeTruthy()
    // No ghost card and no "1 positions" count for an effectively-empty position.
    expect(screen.queryByText("AAVE/GHO")).toBeNull()
    expect(screen.queryByText("1 positions")).toBeNull()
  })

  it("excludes closed positions from the active count", () => {
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={[...rows, { ...rows[0]!, id: "closed", status: "closed" }]} />
      </DisplayPreferencesProvider>,
    )

    // Two rows in, one closed: only the single open position is counted.
    expect(screen.getByText("1 positions")).toBeTruthy()
  })

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

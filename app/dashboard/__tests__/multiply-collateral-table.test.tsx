import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
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

    // Desktop and mobile each render one Manage action for the single open row.
    expect(screen.getAllByRole("button", { name: "Manage" })).toHaveLength(2)
  })

  it("shows the projected liquidation price for an active position", () => {
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={rows} />
      </DisplayPreferencesProvider>,
    )

    // liquidationPriceUsd (2100) is surfaced exact (once per responsive layout:
    // desktop table + mobile card) rather than compacted to "$2.1K".
    expect(screen.getAllByText(/\$2,100/).length).toBeGreaterThan(0)
    expect(screen.getByRole("columnheader", { name: "Risk" })).toBeTruthy()
  })

  it("renders one compact loop table with one action per position", () => {
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={rows} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getByRole("heading", { name: "Loop Positions" })).toBeTruthy()
    expect(screen.getByText("Exposure, return, and liquidation risk for each active loop")).toBeTruthy()
    expect(screen.getByRole("columnheader", { name: "Loop" })).toBeTruthy()
    expect(screen.getByRole("columnheader", { name: "Position" })).toBeTruthy()
    expect(screen.getByRole("columnheader", { name: "Risk" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: "Manage" })).toHaveLength(2)
    expect(screen.queryByRole("button", { name: "Multiply" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Deleverage" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
    expect(screen.getAllByText("ETH loop")).toHaveLength(2)
    expect(screen.getAllByText("Borrowing USDT")).toHaveLength(2)
    expect(screen.getAllByText("$3.5K equity · 2.00×")).toHaveLength(1)
    expect(screen.getAllByText("$7.0K exposure · 3.20% Net APY")).toHaveLength(1)
  })

  it("renders a dash when a position has no liquidation price (debt-free)", () => {
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={[{ ...rows[0]!, debtUsd: 0, liquidationPriceUsd: null }]} />
      </DisplayPreferencesProvider>,
    )

    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0)
  })

  it("routes desktop Manage to the loop market page", () => {
    push.mockClear()
    render(
      <DisplayPreferencesProvider>
        <MultiplyCollateralTable rows={rows} />
      </DisplayPreferencesProvider>,
    )

    fireEvent.click(screen.getAllByRole("button", { name: "Manage" })[0]!)
    expect(push).toHaveBeenCalledWith("/multiply/markets/eth-usdt")
  })
})

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { PortfolioMultiplyCollateral } from "@/app/lib/data/providers/portfolio"
import { MultiplyCollateralTable } from "@/app/portfolio/multiply-collateral-table"

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
  it("calls onDeleverage when the row action is clicked", () => {
    const onDeleverage = vi.fn()
    render(<MultiplyCollateralTable rows={rows} onDeleverage={onDeleverage} />)

    fireEvent.click(screen.getAllByRole("button", { name: "Deleverage" })[0]!)
    expect(onDeleverage).toHaveBeenCalledWith("demo-wallet:eth-usdt")
  })
})

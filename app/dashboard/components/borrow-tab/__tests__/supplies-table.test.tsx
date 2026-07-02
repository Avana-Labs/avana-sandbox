import { render, cleanup, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SuppliesPanel } from "../supplies-table"
import type { SupplyRowContext } from "@/app/lib/data/borrow-position-types"

const visuals = [
  { symbol: "WETH", shortLabel: "E", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
  { symbol: "USDC", shortLabel: "U", bgClassName: "bg-emerald-100", textClassName: "text-emerald-700" },
] as [
  { symbol: string; shortLabel: string; bgClassName: string; textClassName: string },
  { symbol: string; shortLabel: string; bgClassName: string; textClassName: string },
]

// A dust-sized collateral position that nonetheless shares a spoke holding much
// larger collateral: its Max Borrow / Health Factor reflect the whole spoke, not
// the $2 in this row. The columns must say so rather than imply a per-row figure.
const tinyRow: SupplyRowContext = {
  pool: {
    id: "uni-v3-bluechip-weth-usdc",
    name: "WETH / USDC",
    venue: "Uniswap",
    category: "Uniswap 0.05%",
    collateralUsd: 2,
    maxLtv: 71,
    borrowPowerUsd: 3_700,
    liquidationUsd: 4_100,
    pairApr: 3.4,
    visuals,
  },
  borrowedUsd: 0,
  remainingBorrowPowerUsd: 3_700,
  liquidationThresholdUsd: 4_100,
  healthFactor: 4.57,
  pairApr: 3.4,
  feesUsd: 0,
  feesLabel: "$0.00",
}

describe("SuppliesPanel column scope", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the spoke-scoped Max Borrow and Health Factor columns as scope-level", () => {
    const { container } = render(
      <SuppliesPanel
        rows={[tinyRow]}
        totals={{ collateral: 2, borrowed: 0, available: 3_700, fees: 0, averageHf: 4.57 }}
        onBorrowMore={vi.fn()}
        onAddCollateral={vi.fn()}
        onRemove={vi.fn()}
        showSummary={false}
        showHeading={false}
      />,
    )
    const view = within(container)

    // The headers must communicate the account/spoke scope so a $2 row's
    // "$3.7K Max Borrow" is not read as belonging to that position alone.
    expect(view.getAllByText("Scope Max Borrow").length).toBeGreaterThan(0)
    expect(view.getAllByText("Scope Health Factor").length).toBeGreaterThan(0)
    // The bare, misleading per-position labels are gone.
    expect(view.queryByText("Max Borrow")).not.toBeInTheDocument()
    expect(view.queryByText(/^Health Factor$/)).not.toBeInTheDocument()
  })
})

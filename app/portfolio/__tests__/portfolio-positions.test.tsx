import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DashboardBorrowTab } from "@/app/portfolio/dashboard-borrow-tab"

const push = vi.fn()

const poolVisual = { symbol: "WETH", shortLabel: "WETH", bgClassName: "bg-black", textClassName: "text-white" }
const stableVisual = { symbol: "USDC", shortLabel: "USDC", bgClassName: "bg-blue-500", textClassName: "text-white" }

const pool = {
  id: "uni-v3-bluechip-weth-usdc",
  name: "WETH / USDC",
  venue: "Uniswap",
  category: "0.05%",
  collateralUsd: 12000,
  maxLtv: 70,
  borrowPowerUsd: 8400,
  liquidationUsd: 9000,
  pairApr: 3.1,
  visuals: [poolVisual, stableVisual] as [typeof poolVisual, typeof stableVisual],
}

const supplyRow = {
  pool,
  borrowedUsd: 0,
  remainingBorrowPowerUsd: 8400,
  liquidationThresholdUsd: 9000,
  healthFactor: Number.POSITIVE_INFINITY,
  pairApr: 3.1,
  feesUsd: 0,
  feesLabel: "$0.00",
}

const debtRow = {
  id: "debt-1",
  pool,
  borrowedUsd: 500,
  liquidationThresholdUsd: 9000,
  healthFactor: 18,
  borrowApr: 4.2,
  accruedInterestUsd: 5,
  dailyInterestUsd: 0.4,
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("@/app/components/display-preferences", () => ({
  useAmountDisplayPreferences: () => ({ showDollarAmounts: true }),
  useOptionalLocaleDisplayPreferences: () => ({ currency: "USD", language: "EN" }),
}))

vi.mock("@/app/portfolio/borrow-tab/supplies-table", () => ({
  SuppliesHealthFactorCard: () => null,
  SuppliesPanel: ({
    rows,
    onBorrowMore,
    onAddCollateral,
    onRemove,
  }: {
    rows: Array<typeof supplyRow>
    onBorrowMore: (row: typeof supplyRow) => void
    onAddCollateral: (row: typeof supplyRow) => void
    onRemove: (row: typeof supplyRow) => void
  }) => (
    <div>
      <button type="button" onClick={() => onBorrowMore(rows[0]!)}>
        open-borrow
      </button>
      <button type="button" onClick={() => onAddCollateral(rows[0]!)}>
        open-supply
      </button>
      <button type="button" onClick={() => onRemove(rows[0]!)}>
        open-remove
      </button>
    </div>
  ),
}))

vi.mock("@/app/portfolio/borrow-tab/debts-table", () => ({
  CurrentLtvCard: () => null,
  DebtsPanel: ({
    rows,
    onRepay,
    onManage,
  }: {
    rows: Array<typeof debtRow>
    onRepay: (row: typeof debtRow) => void
    onManage: (row: typeof debtRow) => void
  }) => (
    <div>
      <button type="button" onClick={() => onRepay(rows[0]!)}>
        open-repay
      </button>
      <button type="button" onClick={() => onManage(rows[0]!)}>
        open-manage
      </button>
    </div>
  ),
}))

describe("DashboardBorrowTab", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("routes portfolio supply actions to shared action pages", () => {
    render(<DashboardBorrowTab section="supplies" collateralPositions={[supplyRow] as never} returnHref="/portfolio" />)

    fireEvent.click(screen.getByText("open-borrow"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/borrow?market=uni-v3-bluechip-weth-usdc&return=%2Fportfolio")

    fireEvent.click(screen.getByText("open-supply"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/supply?market=uni-v3-bluechip-weth-usdc&return=%2Fportfolio")

    fireEvent.click(screen.getByText("open-remove"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/remove?market=uni-v3-bluechip-weth-usdc&return=%2Fportfolio")
  })

  it("routes portfolio debt actions to shared action pages", () => {
    render(<DashboardBorrowTab section="debts" debtPositions={[debtRow] as never} returnHref="/portfolio" />)

    fireEvent.click(screen.getByText("open-repay"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/repay?market=uni-v3-bluechip-weth-usdc&return=%2Fportfolio")

    fireEvent.click(screen.getByText("open-manage"))
    expect(push).toHaveBeenCalledWith("/actions/borrow/borrow?market=uni-v3-bluechip-weth-usdc&return=%2Fportfolio")
  })
})

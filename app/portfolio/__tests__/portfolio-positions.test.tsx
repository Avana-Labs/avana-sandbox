import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PortfolioPositions } from "@/app/portfolio/portfolio-positions"

const createIntent = vi.fn()
const previewTransaction = vi.fn()
const executeTransaction = vi.fn()

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

const asset = {
  id: "uni-v3-bluechip:usdc",
  name: "USD Coin",
  symbol: "USDC",
  subtitle: "Stablecoin",
  borrowApr: 4.2,
  visual: {
    symbol: "USDC",
    shortLabel: "USDC",
    bgClass: "bg-blue-500",
    textClass: "text-white",
  },
}

vi.mock("@/app/components/display-preferences", () => ({
  useDisplayPreferences: () => ({ showDollarAmounts: true }),
}))

vi.mock("@/app/borrow/components/supplies-table", () => ({
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

vi.mock("@/app/borrow/components/debts-table", () => ({
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

vi.mock("@/app/borrow/components/borrow-modal", () => ({
  BorrowModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof pool; token: typeof asset; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool, token: asset, amountUsd: 250 })}>
        confirm-borrow
      </button>
    ) : null,
}))

vi.mock("@/app/borrow/components/supply-collateral-modal", () => ({
  SupplyCollateralModal: ({
    open,
    onConfirm,
  }: {
    open: boolean
    onConfirm: (result: { pool: typeof pool; amountUsd: number }) => void
  }) =>
    open ? (
      <button type="button" onClick={() => onConfirm({ pool, amountUsd: 400 })}>
        confirm-supply
      </button>
    ) : null,
}))

vi.mock("@/app/borrow/components/repay-remove-modal", () => ({
  RepayRemoveModal: ({
    open,
    context,
    onConfirm,
  }: {
    open: boolean
    context: { mode: "repay" | "remove"; pool: typeof pool } | null
    onConfirm: (result: { mode: "repay" | "remove"; pool: typeof pool; amountUsd: number }) => void
  }) =>
    open && context ? (
      <button type="button" onClick={() => onConfirm({ mode: context.mode, pool, amountUsd: 150 })}>
        {context.mode === "repay" ? "confirm-repay" : "confirm-remove"}
      </button>
    ) : null,
}))

describe("PortfolioPositions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens portfolio modals and closes after mocked confirm", async () => {
    render(
      <PortfolioPositions
        section="supplies"
        collateralPositions={[supplyRow] as never}
        walletId="demo-wallet"
        borrowSession={
          {
            state: {
              accounts: {
                "demo-wallet": {
                  debtPositions: [],
                  collateralPositions: [{ id: "position-1", marketId: pool.id }],
                },
              },
            },
            getBorrowableAssetsForMarket: () => [asset],
            createIntent,
            previewTransaction,
            executeTransaction,
            isPending: false,
          } as never
        }
      />,
    )

    fireEvent.click(screen.getByText("open-borrow"))
    fireEvent.click(screen.getByText("confirm-borrow"))
    fireEvent.click(screen.getByText("open-supply"))
    fireEvent.click(screen.getByText("confirm-supply"))
    fireEvent.click(screen.getByText("open-remove"))
    fireEvent.click(screen.getByText("confirm-remove"))

    expect(createIntent).not.toHaveBeenCalled()
  })

  it("opens debt modals and closes after mocked confirm", async () => {
    render(
      <PortfolioPositions
        section="debts"
        debtPositions={[debtRow] as never}
        walletId="demo-wallet"
        borrowSession={
          {
            state: {
              accounts: {
                "demo-wallet": {
                  debtPositions: [{ id: debtRow.id, assetId: asset.id }],
                  collateralPositions: [],
                },
              },
            },
            getBorrowableAssetsForMarket: () => [asset],
            createIntent,
            previewTransaction,
            executeTransaction,
            isPending: false,
          } as never
        }
      />,
    )

    fireEvent.click(screen.getByText("open-repay"))
    fireEvent.click(screen.getByText("confirm-repay"))
    fireEvent.click(screen.getByText("open-manage"))
    fireEvent.click(screen.getByText("confirm-borrow"))

    expect(createIntent).not.toHaveBeenCalled()
  })
})

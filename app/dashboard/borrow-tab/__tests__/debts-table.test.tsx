import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CurrentLtvCard, DebtsPanel } from "../debts-table"
import type { DebtRowContext } from "@/app/lib/data/borrow-position-types"

const pool = {
  id: "curve-usdc-usdt",
  name: "USDC / USDT",
  venue: "Curve",
  category: "0.01%",
  collateralUsd: 10_000,
  maxLtv: 90,
  borrowPowerUsd: 9_000,
  liquidationUsd: 9_500,
  pairApr: 2.1,
  visuals: [
    { symbol: "USDC", shortLabel: "U", bgClassName: "bg-sky-100", textClassName: "text-sky-700" },
    { symbol: "USDT", shortLabel: "T", bgClassName: "bg-emerald-100", textClassName: "text-emerald-700" },
  ] as [
    { symbol: string; shortLabel: string; bgClassName: string; textClassName: string },
    { symbol: string; shortLabel: string; bgClassName: string; textClassName: string },
  ],
}

const usdtDebt: DebtRowContext = {
  id: "debt-usdc-usdt",
  pool,
  debtAssetSymbol: "USDT",
  borrowedUsd: 6_200,
  liquidationThresholdUsd: 9_500,
  healthFactor: 1.8,
  borrowApr: 5.5,
  accruedInterestUsd: 33.6,
  dailyInterestUsd: 0.94,
}

describe("DebtsPanel", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows a lend-style empty state with heading and count", () => {
    const { container } = render(
      <DebtsPanel
        rows={[]}
        totals={{
          totalBorrowed: 0,
          totalCollateral: 0,
          averageHf: null,
          accruedInterest: 0,
          dailyInterest: 0,
        }}
        onRepay={vi.fn()}
        onManage={vi.fn()}
        showSummary={false}
      />,
    )

    expect(container.textContent).toMatch(/My Debts/)
    expect(container.textContent).toMatch(/0 loans/)
    expect(container.textContent).toMatch(/No active loans\. Borrow against your collateral to get started\./)
    expect(container.textContent).not.toMatch(/Nothing borrowed yet/)
    expect(container.textContent).not.toMatch(/To borrow you need to supply any LPs/)
  })

  it("renders the position's actual debt asset symbol, not a hardcoded USDC", () => {
    const { container } = render(
      <DebtsPanel
        rows={[usdtDebt]}
        totals={{
          totalBorrowed: 6_200,
          totalCollateral: 10_000,
          averageHf: 1.8,
          accruedInterest: 33.6,
          dailyInterest: 0.94,
        }}
        onRepay={vi.fn()}
        onManage={vi.fn()}
        showSummary={false}
        showHeading={false}
      />,
    )

    // The debt-amount sub-line uses the real debt asset (USDT).
    expect(container.textContent).toMatch(/6200\s+USDT/)
    // No hardcoded USDC quantity is emitted for a USDT debt.
    expect(container.textContent).not.toMatch(/6200\s+USDC/)
  })

  it("surfaces borrow rate over live-accruing interest owed as a desktop column", () => {
    const { container } = render(
      <DebtsPanel
        rows={[usdtDebt]}
        totals={{
          totalBorrowed: 6_200,
          totalCollateral: 10_000,
          averageHf: 1.8,
          accruedInterest: 33.6,
          dailyInterest: 0.94,
        }}
        onRepay={vi.fn()}
        onManage={vi.fn()}
        showSummary={false}
        showHeading={false}
      />,
    )

    // The column now mirrors the Lend Assets APY cell: big borrow rate on top, the
    // interest owed accruing (from the recorded base) beneath it.
    expect(container.textContent).toMatch(/INTEREST OWED/)
    expect(container.textContent).toMatch(/5\.50%/)
    expect(container.textContent).toMatch(/33\.60/)
  })

  it("shows the debt as a token amount over its live USD value, and no Borrow button", () => {
    const { container, getAllByRole, queryAllByRole } = render(
      <DebtsPanel
        rows={[usdtDebt]}
        totals={{
          totalBorrowed: 6_200,
          totalCollateral: 10_000,
          averageHf: 1.8,
          accruedInterest: 33.6,
          dailyInterest: 0.94,
        }}
        onRepay={vi.fn()}
        onManage={vi.fn()}
        showSummary={false}
        showHeading={false}
      />,
    )

    // Borrowed reads token-amount-over-USD (like Lend "Deposited"), and the row only
    // offers Repay — borrowing again is not a debt-management action.
    expect(container.textContent).toMatch(/6200\s+USDT/)
    expect(getAllByRole("button", { name: /Repay/ }).length).toBeGreaterThan(0)
    expect(queryAllByRole("button", { name: /^Borrow$/ })).toHaveLength(0)
  })

  it("does not render a bare Opened placeholder row", () => {
    const { container } = render(
      <DebtsPanel
        rows={[usdtDebt]}
        totals={{
          totalBorrowed: 6_200,
          totalCollateral: 10_000,
          averageHf: 1.8,
          accruedInterest: 33.6,
          dailyInterest: 0.94,
        }}
        onRepay={vi.fn()}
        onManage={vi.fn()}
        showSummary={false}
        showHeading={false}
      />,
    )

    expect(container.textContent).not.toMatch(/Opened/)
    expect(container.textContent).not.toMatch(/—/)
  })
})

describe("CurrentLtvCard borrowing-power status", () => {
  afterEach(() => {
    cleanup()
  })

  it("reads NONE (not RISK) when there is no collateral and no debt", () => {
    const { container } = render(<CurrentLtvCard borrowedUsd={0} collateralUsd={0} showBalance />)
    expect(container.textContent).toMatch(/NONE/)
    expect(container.textContent).not.toMatch(/RISK/)
  })

  it("reads GOOD when a healthy position has remaining borrowing power", () => {
    const { container } = render(<CurrentLtvCard borrowedUsd={2_000} collateralUsd={10_000} showBalance />)
    expect(container.textContent).toMatch(/GOOD/)
  })

  it("surfaces borrowing cost (interest per day + accrued) when provided", () => {
    const { container } = render(
      <CurrentLtvCard
        borrowedUsd={6_200}
        collateralUsd={10_000}
        showBalance
        dailyInterestUsd={0.94}
        accruedInterestUsd={33.6}
      />,
    )
    expect(container.textContent).toMatch(/Interest \/ day/)
    expect(container.textContent).toMatch(/Accrued interest/)
    expect(container.textContent).toMatch(/0\.94/)
    expect(container.textContent).toMatch(/33\.60/)
  })

  it("omits the borrowing-cost row when no interest figures are passed", () => {
    const { container } = render(<CurrentLtvCard borrowedUsd={2_000} collateralUsd={10_000} showBalance />)
    expect(container.textContent).not.toMatch(/Interest \/ day/)
    expect(container.textContent).not.toMatch(/Accrued interest/)
  })
})

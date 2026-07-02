import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DebtsPanel } from "../debts-table"
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

  it("renders the position's actual debt asset symbol, not a hardcoded USDC", () => {
    const { container } = render(
      <DebtsPanel
        rows={[usdtDebt]}
        totals={{ totalBorrowed: 6_200, totalCollateral: 10_000, averageHf: 1.8, accruedInterest: 33.6, dailyInterest: 0.94 }}
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
})

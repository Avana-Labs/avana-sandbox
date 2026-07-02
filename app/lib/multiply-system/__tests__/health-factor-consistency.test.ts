import { describe, expect, it } from "vitest"
import type { MultiplyPosition, MultiplySystemState } from "@/app/lib/multiply-engine"
import { buildMultiplyCatalogMarketsRecord } from "@/app/lib/multiply-system/catalog"
import { buildPortfolioMultiplyData } from "@/app/lib/multiply-system/read-model"

function stateWith(positions: MultiplyPosition[]): MultiplySystemState {
  return {
    now: 1_700_000_000_000,
    markets: buildMultiplyCatalogMarketsRecord(),
    positions: Object.fromEntries(positions.map((position) => [position.id, position])),
    transactions: [],
  }
}

function zeroDebtPosition(marketId: string): MultiplyPosition {
  return {
    id: `wallet-1:${marketId}`,
    walletId: "wallet-1",
    marketId,
    collateralAmount: 1,
    collateralValueUsd: 5_000,
    debtValueUsd: 0,
    multiplier: 1,
    ltv: 0,
    healthFactor: "infinity",
    liquidationPrice: null,
    netApy: 0,
    openedAt: 1_700_000_000_000,
    lastUpdatedAt: 1_700_000_000_000,
  }
}

describe("multiply credit-health aggregate agrees with the per-row table", () => {
  const marketId = Object.keys(buildMultiplyCatalogMarketsRecord())[0]!

  it("reports ∞ (not —) when positions exist but every one is debt-free", () => {
    const data = buildPortfolioMultiplyData("wallet-1", stateWith([zeroDebtPosition(marketId)]))

    // Every row already renders ∞ (POSITIVE_INFINITY); the hero/credit-health card
    // aggregate must be infinite too so the two do not disagree (∞ vs —).
    expect(data.lpCollaterals.every((row) => !Number.isFinite(row.healthFactor))).toBe(true)
    expect(data.creditLines.averageHealthFactor).toBe(Number.POSITIVE_INFINITY)
  })

  it("reports null (—) only when the wallet has no positions at all", () => {
    const data = buildPortfolioMultiplyData("wallet-1", stateWith([]))
    expect(data.creditLines.averageHealthFactor).toBeNull()
  })
})

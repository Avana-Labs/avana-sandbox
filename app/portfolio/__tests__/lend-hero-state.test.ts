import { describe, expect, it } from "vitest"
import { buildLendSnapshotFromTabData } from "@/app/portfolio/lend-hero-state"
import type { PortfolioLendTabData } from "@/app/lib/data/providers/portfolio/types"

function buildTabData(overrides?: Partial<PortfolioLendTabData>): PortfolioLendTabData {
  return {
    investments: [
      {
        id: "eth-position",
        marketId: "eth",
        symbol: "ETH",
        name: "Ethereum",
        balance: 1.2,
        priceUsd: 3500,
        suppliedUsd: 4200,
        principalUsd: 4000,
        earnedUsd: 200,
        dailyEarnedUsd: 0.44,
        apyPct: 4.2,
        principalAmount: 1.142857,
        interestEarned: 0.057143,
        availableToWithdraw: 1.2,
        status: "active",
      },
    ],
    positions: [],
    strategyBuckets: [],
    history: [
      {
        id: "tx-deposit",
        at: "2026-06-19T12:00:00.000Z",
        product: "lend",
        kind: "open",
        status: "confirmed",
        amountUsd: 1500,
        primaryLabel: "Simulated deposit",
        secondaryLabel: "0.4 ETH",
        txHash: "0xdeposit",
      },
      {
        id: "tx-withdraw",
        at: "2026-06-19T18:00:00.000Z",
        product: "lend",
        kind: "reduce",
        status: "confirmed",
        amountUsd: 300,
        primaryLabel: "Simulated withdraw",
        secondaryLabel: "0.0857 ETH",
        txHash: "0xwithdraw",
      },
    ],
    ...overrides,
  }
}

describe("buildLendSnapshotFromTabData", () => {
  it("builds lend chart data from live wallet history instead of seeded demo variance", () => {
    const snapshot = buildLendSnapshotFromTabData(buildTabData())

    expect(snapshot.totalSuppliedUsd).toBe(4200)
    expect(snapshot.totalEarnedUsd).toBe(200)
    expect(snapshot.rangeData["1D"].length).toBeGreaterThan(10)
    expect(snapshot.rangeData["1D"].at(-1)?.value).toBeCloseTo(4200, 6)
    expect(snapshot.rangeData["1D"][0]?.value).toBeCloseTo(3000, 6)
  })
})

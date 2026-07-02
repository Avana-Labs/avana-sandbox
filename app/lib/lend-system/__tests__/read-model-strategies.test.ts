import { describe, expect, it } from "vitest"
import { buildLendStrategyBuckets, buildPortfolioLendData } from "@/app/lib/lend-system/read-model"
import { buildMockLendSystemState } from "@/app/lib/lend-system/mock"
import { WALLET_STRATEGY_BUCKETS } from "@/app/lib/data/mock/wallet/portfolio/strategies"

describe("buildLendStrategyBuckets", () => {
  it("derives opportunity buckets from the live markets, not the static catalog", () => {
    const markets = Object.values(buildMockLendSystemState("demo-wallet").markets)
    const buckets = buildLendStrategyBuckets(markets)

    expect(buckets.length).toBeGreaterThan(0)

    // The static catalog invents pools with no backing live market (e.g. "Curve
    // ETH-BTC"); the live buckets must not surface those.
    const staticOnlyNames = new Set(
      WALLET_STRATEGY_BUCKETS.flatMap((bucket) => bucket.pools.map((pool) => pool.name)).filter(
        (name) => !markets.some((entry) => name === `Aave ${entry.asset.symbol}`),
      ),
    )

    for (const bucket of buckets) {
      expect(bucket.pools.length).toBeGreaterThan(0)
      for (const pool of bucket.pools) {
        // Every pool must correspond to a real live market...
        const market = markets.find((entry) => pool.name === `Aave ${entry.asset.symbol}`)
        expect(market).toBeDefined()
        // ...with the market's real APY and USD TVL, not a hardcoded catalog entry.
        expect(pool.apyPct).toBeCloseTo(market!.totalApy * 100, 6)
        expect(pool.tvlUsd).toBeCloseTo(market!.totalSupplied * market!.assetPriceUsd, 3)
        expect(staticOnlyNames.has(pool.name)).toBe(false)
      }
    }
  })

  it("labels each bucket with the real min-max APY range of its markets", () => {
    const markets = Object.values(buildMockLendSystemState("demo-wallet").markets)
    const buckets = buildLendStrategyBuckets(markets)

    for (const bucket of buckets) {
      const apys = bucket.pools.map((pool) => pool.apyPct)
      const min = Math.min(...apys)
      const max = Math.max(...apys)
      const expected =
        min === max ? `${max.toFixed(1)}% APY` : `${min.toFixed(1)}-${max.toFixed(1)}% APY range`
      expect(bucket.apyRangeLabel).toBe(expected)
    }
  })

  it("feeds real strategy buckets through buildPortfolioLendData", () => {
    const state = buildMockLendSystemState("demo-wallet")
    const data = buildPortfolioLendData("demo-wallet", state)
    expect(data.strategyBuckets.length).toBeGreaterThan(0)
  })

  it("reports dailyEarnedUsd as a projected APY run-rate (APY/365), not realized earnings", () => {
    // Wallet with a seeded active supply position so investments is non-empty.
    const state = buildMockLendSystemState("demo-wallet")
    const [marketId, market] = Object.entries(state.markets)[0]
    const now = state.now
    state.positions["demo-wallet:seed"] = {
      positionId: "demo-wallet:seed",
      walletId: "demo-wallet",
      marketId,
      asset: market.asset.symbol,
      principalAmount: 1_000,
      scaledBalance: 1_000,
      liquidityIndexAtLastAction: market.liquidityIndex,
      currentSuppliedAmount: 1_000,
      interestEarned: 0,
      rewardsEarnedUsd: 0,
      suppliedValueUsd: 1_000 * market.assetPriceUsd,
      openedAt: now,
      updatedAt: now,
      status: "active",
    }

    const data = buildPortfolioLendData("demo-wallet", state)
    const seeded = data.investments.find((entry) => entry.id === "demo-wallet:seed")
    expect(seeded).toBeDefined()
    // The figure is the annualized run-rate divided by 365 — a projection, so it is
    // non-zero even though the seconds-old position has accrued nothing yet.
    expect(seeded!.earnedUsd).toBe(0)
    expect(seeded!.dailyEarnedUsd).toBeCloseTo((seeded!.suppliedUsd * (market.totalApy)) / 365, 6)
  })
})

import { describe, expect, it } from "vitest"
import { ASSET_TVL_TARGET_USD, buildBorrowSeed, POOL_TVL_TARGET_USD } from "@/app/lib/convex-seed/build-seed"

const ASOF = Date.UTC(2026, 5, 19) // fixed for reproducibility

describe("buildBorrowSeed", () => {
  it("seeds one market row per borrow pool + asset (128 total)", () => {
    const seed = buildBorrowSeed({ days: 30, asOf: ASOF })
    const pools = seed.markets.filter((m) => m.scope === "pool")
    const assets = seed.markets.filter((m) => m.scope === "asset")
    expect(pools.length).toBe(64)
    expect(assets.length).toBe(64)
    expect(seed.markets.length).toBe(128)
    // one risk assessment per market
    expect(seed.risk.length).toBe(128)
  })

  it("generates `days` daily stat + revenue rows per market", () => {
    const days = 30
    const seed = buildBorrowSeed({ days, asOf: ASOF })
    expect(seed.dailyStats.length).toBe(128 * days)
    expect(seed.revenue.length).toBe(128 * days)
  })

  it("uses route-matching slugs (asset = spoke-scoped id, pool = pool id)", () => {
    const seed = buildBorrowSeed({ days: 1, asOf: ASOF })
    const asset = seed.markets.find((m) => m.scope === "asset")!
    const pool = seed.markets.find((m) => m.scope === "pool")!
    expect(asset.slug).toMatch(/^[a-z0-9-]+:[a-z0-9]+$/) // e.g. uni-v2:usdc
    expect(pool.slug).not.toContain(":") // e.g. uni-v2-weth-usdc
    expect(asset.category === "stable" || asset.category === "crypto").toBe(true)
  })

  it("produces sane, finite daily values (utilization 1..99, non-negative money)", () => {
    const seed = buildBorrowSeed({ days: 90, asOf: ASOF })
    for (const row of seed.dailyStats) {
      expect(Number.isFinite(row.suppliedUsd)).toBe(true)
      expect(row.suppliedUsd).toBeGreaterThanOrEqual(0)
      expect(row.borrowedUsd).toBeGreaterThanOrEqual(0)
      expect(row.utilizationPct).toBeGreaterThanOrEqual(1)
      expect(row.utilizationPct).toBeLessThanOrEqual(99)
      expect(row.borrowAprPct).toBeGreaterThan(0)
      expect(row.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    // last day is the asOf date
    const lastDay = seed.dailyStats[seed.dailyStats.length - 1]!.day
    expect(lastDay).toBe(new Date(ASOF).toISOString().slice(0, 10))
  })

  it("calibrates the latest day to the canonical economy ($1.6B collateral / $700M loans / $900M credit)", () => {
    const seed = buildBorrowSeed({ days: 180, asOf: ASOF })
    const lastDay = new Date(ASOF).toISOString().slice(0, 10)
    const scopeBySlug = new Map(seed.markets.map((m) => [m.slug, m.scope]))
    let poolTvl = 0
    let assetTvl = 0
    for (const row of seed.dailyStats) {
      if (row.day !== lastDay) continue
      if (scopeBySlug.get(row.slug) === "pool") poolTvl += row.suppliedUsd
      else assetTvl += row.suppliedUsd
    }
    // Calibrated to the targets (within rounding).
    expect(Math.abs(poolTvl - POOL_TVL_TARGET_USD)).toBeLessThan(POOL_TVL_TARGET_USD * 0.0001)
    expect(Math.abs(assetTvl - ASSET_TVL_TARGET_USD)).toBeLessThan(ASSET_TVL_TARGET_USD * 0.0001)
    const availableCredit = poolTvl - assetTvl
    expect(Math.round(availableCredit / 1e6)).toBe(900) // $900M
  })

  it("is fully deterministic for a fixed asOf", () => {
    const a = buildBorrowSeed({ days: 14, asOf: ASOF })
    const b = buildBorrowSeed({ days: 14, asOf: ASOF })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it("scales daily rows with the window (365-day default ≈ 46.7k per table)", () => {
    const seed = buildBorrowSeed({ days: 365, asOf: ASOF })
    expect(seed.dailyStats.length).toBe(128 * 365) // 46,720
    expect(seed.revenue.length).toBe(128 * 365)
  })
})

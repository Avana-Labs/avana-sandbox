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

  it("seeds a rich risk breakdown + metrics (not an empty stub)", () => {
    const seed = buildBorrowSeed({ days: 1, asOf: ASOF })
    expect(seed.risk.length).toBe(128)
    for (const r of seed.risk) {
      // assets get 4 factors, pools get 5 — never the old empty stub.
      expect(r.breakdown.length).toBeGreaterThanOrEqual(4)
      expect(r.metrics.length).toBeGreaterThanOrEqual(1)
      expect(r.premiumBps).toBeGreaterThan(0)
      expect(r.breakdown.reduce((s, b) => s + b.bps, 0)).toBeGreaterThan(0)
      for (const b of r.breakdown) expect(b.description.length).toBeGreaterThan(0)
    }
  })

  it("seeds per-asset allocation rows (latest day, shares ~sum to 100, calibrated values)", () => {
    const seed = buildBorrowSeed({ days: 30, asOf: ASOF })
    const lastDay = new Date(ASOF).toISOString().slice(0, 10)
    expect(seed.allocation.length).toBeGreaterThan(0)
    for (const row of seed.allocation) {
      expect(row.day).toBe(lastDay)
      expect(row.assetSlug).toContain(":") // asset = spoke-scoped id
      expect(row.poolSlug).not.toContain(":") // pool = pool id
      expect(row.sharePct).toBeGreaterThanOrEqual(0)
      expect(row.sharePct).toBeLessThanOrEqual(100)
      expect(Number.isFinite(row.valueUsd)).toBe(true)
      expect(row.valueUsd).toBeGreaterThanOrEqual(0)
    }
    // Per asset, the shares are re-scaled to sum to ~100.
    const sharesByAsset = new Map<string, number>()
    for (const row of seed.allocation) {
      sharesByAsset.set(row.assetSlug, (sharesByAsset.get(row.assetSlug) ?? 0) + row.sharePct)
    }
    for (const [, sum] of sharesByAsset) expect(Math.abs(sum - 100)).toBeLessThan(0.5)
  })

  it("anchors allocation value to the calibrated per-asset supplied (sums ≤ asset TVL band)", () => {
    const seed = buildBorrowSeed({ days: 60, asOf: ASOF })
    const lastDay = new Date(ASOF).toISOString().slice(0, 10)
    const suppliedByAsset = new Map<string, number>()
    for (const s of seed.dailyStats) {
      if (s.day === lastDay) suppliedByAsset.set(s.slug, s.suppliedUsd)
    }
    const valueByAsset = new Map<string, number>()
    for (const row of seed.allocation) {
      valueByAsset.set(row.assetSlug, (valueByAsset.get(row.assetSlug) ?? 0) + row.valueUsd)
    }
    // Allocation values sum to (very close to) the asset's calibrated supplied,
    // so the detail "Value" column reconciles with the headline TVL. The small
    // residual is share-rescale + per-row dollar rounding.
    for (const [assetSlug, value] of valueByAsset) {
      const supplied = suppliedByAsset.get(assetSlug) ?? 0
      if (supplied > 0) expect(Math.abs(value - supplied) / supplied).toBeLessThan(0.01)
    }
  })
})

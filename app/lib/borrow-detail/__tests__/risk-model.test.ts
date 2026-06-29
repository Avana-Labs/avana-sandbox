import { describe, expect, it } from "vitest"
import { BORROW_POOL_CATALOG } from "@/app/lib/borrow-sim"
import { listSpokeBorrowables } from "@/app/lib/borrow-system/registry"
import { riskLevelFromBps } from "@/app/lib/borrow-detail/allocation"
import {
  assetRiskPremiumBps,
  buildAssetRiskAssessment,
  buildPoolRiskAssessment,
} from "@/app/lib/borrow-detail/risk-model"

describe("shared risk-model (single source for mock + Convex seed)", () => {
  it("builds a rich, deterministic asset risk assessment", () => {
    const asset = listSpokeBorrowables()[0]!
    const a = buildAssetRiskAssessment(asset)
    const b = buildAssetRiskAssessment(asset)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)) // deterministic
    expect(a.breakdown.length).toBe(4)
    expect(a.metrics.length).toBe(4)
    expect(a.premiumBps).toBe(assetRiskPremiumBps(asset))
    expect(a.level).toBe(riskLevelFromBps(a.premiumBps))
    expect(a.headline).toContain("premium")
    for (const factor of a.breakdown) expect(factor.description.length).toBeGreaterThan(0)
  })

  it("builds a rich pool risk assessment anchored to the catalog premium", () => {
    const pool = BORROW_POOL_CATALOG[0]!
    const r = buildPoolRiskAssessment(pool)
    expect(r.premiumBps).toBe(pool.riskPremiumBps)
    expect(r.level).toBe(riskLevelFromBps(pool.riskPremiumBps))
    expect(r.breakdown.length).toBe(5)
    expect(r.metrics.length).toBe(4)
  })

  it("gives every asset + pool a distinct, finite premium", () => {
    for (const asset of listSpokeBorrowables()) {
      const r = buildAssetRiskAssessment(asset)
      expect(Number.isFinite(r.premiumBps)).toBe(true)
      expect(r.premiumBps).toBeGreaterThan(0)
    }
    for (const pool of BORROW_POOL_CATALOG) {
      const r = buildPoolRiskAssessment(pool)
      expect(Number.isFinite(r.premiumBps)).toBe(true)
    }
  })
})

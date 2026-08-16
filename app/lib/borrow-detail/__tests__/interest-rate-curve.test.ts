import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  borrowAprAtUtilization,
  buildBorrowInterestRateCurve,
  buildPercentAxisTicks,
  niceCeil,
} from "@/app/lib/borrow-detail/interest-rate-curve"

describe("interest-rate-curve", () => {
  it("niceCeil uses 1-2-5 magnitude steps", () => {
    expect(niceCeil(10)).toBe(10)
    expect(niceCeil(11)).toBe(20)
    expect(niceCeil(51)).toBe(100)
    expect(niceCeil(3.2)).toBe(5)
  })

  it("buildPercentAxisTicks scales past the old hardcoded 0–10% axis", () => {
    const ticks = buildPercentAxisTicks(51)
    expect(ticks[0]).toBe(0)
    expect(ticks.at(-1)).toBe(100)
    expect(ticks.at(-1)!).toBeGreaterThan(10)
  })

  it("kinked curve reaches slope-above-optimal at 100% util", () => {
    const curve = buildBorrowInterestRateCurve(70, 4, {
      optimalUtilizationPct: 80,
      slopeBelowOptimalPct: 4,
      slopeAboveOptimalPct: 60,
      baseBorrowRatePct: 0.5,
    })
    const atOptimal = curve.points.find((point) => point.utilization === 80)!
    const atFull = curve.points.find((point) => point.utilization === 100)!
    expect(atOptimal.apr).toBeCloseTo(4.5, 5)
    expect(atFull.apr).toBeCloseTo(64.5, 5)
    expect(curve.maxApr).toBeGreaterThanOrEqual(64.5)
    expect(curve.yTicks.at(-1)).toBe(curve.maxApr)
  })

  // C1: the curve must be anchored to the rate actually paid — the curve value AT the
  // current utilization has to equal the displayed/paid APR, regardless of the (slug-hashed)
  // base-rate param. Otherwise the "Current" marker points at a curve value that is NOT the
  // headline APR (the marker-vs-headline mismatch this test guards against).
  const irm = {
    optimalUtilizationPct: 80,
    slopeBelowOptimalPct: 4,
    slopeAboveOptimalPct: 60,
    baseBorrowRatePct: 0.5,
  }

  it("anchors the curve so curve(currentUtilization) === paid APR even when base param disagrees", () => {
    // Unanchored, apr(50) would be 0.5 + 4·(50/80) = 3.0 — but the engine charges 8.0.
    const paidApr = 8
    const curve = buildBorrowInterestRateCurve(50, paidApr, irm)
    const atCurrent = curve.points.find((point) => point.utilization === 50)!
    expect(atCurrent.apr).toBeCloseTo(paidApr, 6)
    expect(borrowAprAtUtilization(50, irm, { utilization: 50, apr: paidApr })).toBeCloseTo(paidApr, 6)
    // The kinked shape is preserved (slopes intact) around the anchor.
    expect(curve.points.find((p) => p.utilization === 100)!.apr).toBeGreaterThan(paidApr)
  })

  it("holds the anchor for a flat, utilization-independent paid APR at any utilization", () => {
    for (const [util, paidApr] of [
      [20, 6.2],
      [64, 8],
      [95, 12.5],
    ] as const) {
      const curve = buildBorrowInterestRateCurve(util, paidApr, irm)
      expect(curve.points.find((p) => p.utilization === util)!.apr).toBeCloseTo(paidApr, 6)
    }
  })

  it("exposes the anchored base APR (curve value at 0% util) for the displayed base-rate row", () => {
    const paidApr = 8
    const curve = buildBorrowInterestRateCurve(50, paidApr, irm)
    expect(curve.baseApr).toBeCloseTo(curve.points.find((p) => p.utilization === 0)!.apr, 6)
    expect(curve.baseApr).toBeGreaterThanOrEqual(0)
  })
})

describe("InterestRateModelCard SVG IRM", () => {
  it("draws an SVG kinked curve with dynamic Y ticks (not hardcoded 0–10)", () => {
    const source = readFileSync(
      resolve(__dirname, "../../../borrow/_detail/asset-sections/InterestRateModelCard.tsx"),
      "utf8",
    )
    expect(source).toMatch(/<svg/)
    expect(source).toMatch(/buildBorrowInterestRateCurve/)
    expect(source).not.toMatch(/const Y_TICKS = \[0, 5, 10\]/)
    expect(source).not.toMatch(/HTMLCanvasElement/)
    expect(source).toMatch(/detail\.interestRateModel/)
  })
})

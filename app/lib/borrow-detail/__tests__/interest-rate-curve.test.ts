import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
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

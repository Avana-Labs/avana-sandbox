import { describe, expect, it } from "vitest"
import {
  activeHealthFactorZoneIndex,
  healthFactorBarPositionPct,
  healthFactorToneFromAfter,
  healthFactorStatusLabel,
  isHealthFactorMetric,
  parseHealthFactorValue,
  resolveMetricTone,
} from "@/app/lib/action-system/health-factor-ui"

describe("health factor ui helpers", () => {
  it("detects health factor metric rows", () => {
    expect(isHealthFactorMetric("Health factor")).toBe(true)
    expect(isHealthFactorMetric("Health factor after", "health-factor")).toBe(true)
    expect(isHealthFactorMetric("Net balance")).toBe(false)
  })

  it("maps after values to tone bands", () => {
    expect(healthFactorToneFromAfter("4.39")).toBe("positive")
    expect(healthFactorToneFromAfter("1.20")).toBe("positive")
    expect(healthFactorToneFromAfter("1.10")).toBe("warning")
    expect(healthFactorToneFromAfter("1.02")).toBe("danger")
    expect(healthFactorToneFromAfter("∞")).toBe("positive")
  })

  it("parses health factor values for the bar", () => {
    expect(parseHealthFactorValue("4.39")).toBe(4.39)
    expect(parseHealthFactorValue("∞")).toBe(Number.POSITIVE_INFINITY)
    expect(activeHealthFactorZoneIndex(4.39)).toBe(0)
    expect(activeHealthFactorZoneIndex(Number.POSITIVE_INFINITY)).toBe(0)
    expect(healthFactorStatusLabel(1.2).label).toBe("Caution")
    expect(healthFactorStatusLabel(1.05).label).toBe("At risk")
  })

  it("positions safer health factors toward the left of the bar", () => {
    expect(healthFactorBarPositionPct(9.6)).toBeLessThan(healthFactorBarPositionPct(1.2))
    expect(healthFactorBarPositionPct(Number.POSITIVE_INFINITY)).toBe(8)
  })

  it("prefers health factor tone over generic default", () => {
    expect(resolveMetricTone("Health factor", "default", "1.08", "hf")).toBe("warning")
  })
})

import { describe, expect, it } from "vitest"
import { parseActionPercentBps, parsePositiveActionAmount, sanitizeDecimalInput } from "@/app/lib/action-system/amount-input"

describe("action amount parsing", () => {
  it.each(["1abc", "1.2.3", "1,000", "Infinity", "NaN", "-1", "0", ""])("rejects malformed amount %s", (value) => {
    expect(parsePositiveActionAmount(value)).toBeNull()
  })

  it("accepts complete positive decimal input", () => {
    expect(parsePositiveActionAmount("12.34")).toBe(12.34)
    expect(parsePositiveActionAmount(".5")).toBe(0.5)
    expect(parsePositiveActionAmount("1.")).toBe(1)
  })

  it("strips non-numeric characters while typing", () => {
    expect(sanitizeDecimalInput("qqqqqq")).toBe("")
    expect(sanitizeDecimalInput("12a3.4b5")).toBe("123.45")
    expect(sanitizeDecimalInput("1.2.3")).toBe("1.23")
  })

  it("converts percentages to integer basis points within 0-100%", () => {
    expect(parseActionPercentBps("25")).toBe(2500)
    expect(parseActionPercentBps("12.345")).toBe(1235)
    expect(parseActionPercentBps("100.1")).toBeNull()
    expect(parseActionPercentBps("50abc")).toBeNull()
  })
})

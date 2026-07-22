import { describe, expect, it } from "vitest"
import { formatActionFeeSummary } from "@/app/lib/action-system/formatters"
import { ACTION_INFO_TOOLTIPS } from "@/app/lib/action-system/metric-tooltips"

describe("one honest fee story (#30)", () => {
  it("surfaces only the network fee — no fabricated protocol fee — since none is deducted", () => {
    // The engines don't deduct an Avana/protocol fee, so the summary is the network fee alone.
    expect(formatActionFeeSummary(1000, 0.24)).toBe("~ $0.24")
    expect(formatActionFeeSummary(0, 0.24)).toBe("~ $0.24")
    expect(formatActionFeeSummary(1000, 0.24)).not.toMatch(/bps|basis points/)
  })

  it("tooltip no longer claims a basis-point protocol fee", () => {
    expect(ACTION_INFO_TOOLTIPS.fee).not.toMatch(/basis points|bps/)
    expect(ACTION_INFO_TOOLTIPS.fee).toMatch(/network fee/i)
  })
})

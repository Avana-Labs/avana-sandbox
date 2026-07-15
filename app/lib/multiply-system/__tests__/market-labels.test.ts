import { describe, expect, it } from "vitest"
import { formatMultiplyLoopMarketLabel, formatMultiplyLoopPairLabel } from "@/app/lib/multiply-system/market-labels"

describe("multiply market labels", () => {
  it("formats pair and role labels", () => {
    expect(formatMultiplyLoopPairLabel("USDC", "GHO")).toBe("USDC / GHO")
    expect(formatMultiplyLoopMarketLabel("USDC", "GHO")).toBe("USDC collateral · borrow GHO")
  })
})

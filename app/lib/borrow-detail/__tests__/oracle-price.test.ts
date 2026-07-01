import { describe, expect, it } from "vitest"
import { injectPoolOraclePrice } from "@/app/lib/borrow-detail/convex-detail"
import type { QuickStat } from "@/app/lib/borrow-detail/types"

const stats = (oracle: string): QuickStat[] => [
  { id: "oraclePrice", label: "Oracle price", value: oracle },
  { id: "totalSupplied", label: "Total Supplied", value: "$1.0M" },
]

describe("injectPoolOraclePrice", () => {
  it("overrides the oracle-price stat with the real DefiLlama pair rate (price0 / price1)", () => {
    // WETH at $3,102.55, USDC at $1 → pool oracle price = WETH price in USDC.
    const out = injectPoolOraclePrice(stats("$3,450.00"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    expect(out.find((s) => s.id === "oraclePrice")?.value).toBe("$3,102.55")
    // Other stats are untouched.
    expect(out.find((s) => s.id === "totalSupplied")?.value).toBe("$1.0M")
  })

  it("uses the same real price regardless of the hardcoded fixture value", () => {
    // Same asset (WETH), different starting fixtures → one consistent oracle price.
    const a = injectPoolOraclePrice(stats("$3,450.00"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    const b = injectPoolOraclePrice(stats("$99.99"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    expect(a.find((s) => s.id === "oraclePrice")?.value).toBe(b.find((s) => s.id === "oraclePrice")?.value)
  })

  it("keeps the fixture fallback when the oracle is unavailable or a leg is unpriced", () => {
    expect(injectPoolOraclePrice(stats("$3,450.00"), null, "WETH", "USDC")).toEqual(stats("$3,450.00"))
    expect(
      injectPoolOraclePrice(stats("$3,450.00"), { usdc: 1 }, "WETH", "USDC").find((s) => s.id === "oraclePrice")?.value,
    ).toBe("$3,450.00")
  })
})

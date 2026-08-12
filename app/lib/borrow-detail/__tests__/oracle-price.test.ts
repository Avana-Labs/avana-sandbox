import { describe, expect, it } from "vitest"
import { injectPoolOraclePrice } from "@/app/lib/borrow-detail/convex-detail"
import type { QuickStat } from "@/app/lib/borrow-detail/types"

const stats = (oracle: string): QuickStat[] => [
  { id: "price", label: "Price", value: oracle },
  { id: "available", label: "Available Liquidity", value: "$1.0M" },
]

describe("injectPoolOraclePrice", () => {
  it("overrides the oracle-price stat with the real DefiLlama pair rate (price0 / price1)", () => {
    // WETH at $3,102.55, USDC at $1 → pool oracle price = WETH price in USDC.
    const out = injectPoolOraclePrice(stats("$3,450.00"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    expect(out.find((s) => s.id === "price")?.value).toBe("$3,102.55")
    // Other stats are untouched.
    expect(out.find((s) => s.id === "available")?.value).toBe("$1.0M")
  })

  it("uses the same real price regardless of the hardcoded fixture value", () => {
    // Same asset (WETH), different starting fixtures → one consistent oracle price.
    const a = injectPoolOraclePrice(stats("$3,450.00"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    const b = injectPoolOraclePrice(stats("$99.99"), { weth: 3102.55, usdc: 1 }, "WETH", "USDC")
    expect(a.find((s) => s.id === "price")?.value).toBe(b.find((s) => s.id === "price")?.value)
  })

  it("drops the oracle-price stat (never the fabricated fallback) when unpriced or unavailable", () => {
    // Oracle unavailable → the hardcoded fixture value must not reach the display path.
    const whenNull = injectPoolOraclePrice(stats("$3,450.00"), null, "WETH", "USDC")
    expect(whenNull.find((s) => s.id === "price")).toBeUndefined()
    // Other stats survive.
    expect(whenNull.find((s) => s.id === "available")?.value).toBe("$1.0M")

    // One leg unpriced → still dropped rather than fabricated.
    const whenPartial = injectPoolOraclePrice(stats("$3,450.00"), { usdc: 1 }, "WETH", "USDC")
    expect(whenPartial.find((s) => s.id === "price")).toBeUndefined()
  })
})

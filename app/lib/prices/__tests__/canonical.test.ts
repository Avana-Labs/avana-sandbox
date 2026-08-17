import { describe, expect, it } from "vitest"
import { canonicalPriceMap, canonicalPriceUsd, poolPairPriceUsd } from "@/app/lib/prices/canonical"
import { sandboxBaselinePriceUsd } from "@/app/lib/prices/sandbox-baseline-prices"
import { SWAP_ASSETS } from "@/app/lib/swap-system/catalog"

describe("canonical price basis", () => {
  it("resolves known token prices from the single snapshot", () => {
    expect(canonicalPriceUsd("ETH")).toBe(1934)
    expect(canonicalPriceUsd("eth")).toBe(1934) // case-insensitive
    expect(canonicalPriceUsd("USDC")).toBe(1)
    expect(canonicalPriceUsd("WBTC")).toBe(65_000)
  })

  it("returns undefined for unknown symbols (never a misleading $1 default)", () => {
    expect(canonicalPriceUsd("NOTATOKEN")).toBeUndefined()
    expect(canonicalPriceUsd("")).toBeUndefined()
  })

  it("agrees with the valuation basis used by detail tiles (one source, not two copies)", () => {
    // Detail tiles value via sandboxBaselinePriceUsd; the list/pool basis must match it
    // exactly so the same token never shows two different prices one click apart.
    for (const sym of ["ETH", "USDC", "USDT", "WBTC", "AAVE", "LINK"]) {
      expect(canonicalPriceUsd(sym)).toBe(sandboxBaselinePriceUsd(sym))
    }
  })

  it("exposes a priceKey-keyed map for the pool oracle path", () => {
    const map = canonicalPriceMap()
    expect(map.eth).toBe(1934)
    expect(map.usdc).toBe(1)
  })
})

describe("pool pair price = PA / PB", () => {
  it("prices a volatile/stable pair as the USD ratio", () => {
    // 1 ETH = 1934 USDC
    expect(poolPairPriceUsd("ETH", "USDC")).toBe(1934)
  })

  it("prices the inverse as 1 / ratio", () => {
    const ethUsdc = poolPairPriceUsd("ETH", "USDC")!
    const usdcEth = poolPairPriceUsd("USDC", "ETH")!
    expect(usdcEth).toBeCloseTo(1 / 1934, 10)
    // Round-trip: A/B * B/A == 1
    expect(ethUsdc * usdcEth).toBeCloseTo(1, 10)
  })

  it("derives a BTC/ETH-style pair from single-token USD prices", () => {
    // WBTC 65000 / ETH 1934 ≈ 33.61 ETH per WBTC
    expect(poolPairPriceUsd("WBTC", "ETH")).toBeCloseTo(65_000 / 1934, 8)
  })

  it("keeps the real stablecoin ratio rather than forcing exactly 1", () => {
    // Both pinned at 1 here, so the ratio is 1 — but it is COMPUTED from the prices,
    // so a future depeg (e.g. USDC 0.997) would flow through instead of a hardcoded 1.
    expect(poolPairPriceUsd("USDC", "USDT")).toBe(1)
  })

  it("returns undefined when a side is unpriced or zero (caller drops the stat)", () => {
    expect(poolPairPriceUsd("ETH", "NOTATOKEN")).toBeUndefined()
    expect(poolPairPriceUsd("NOTATOKEN", "ETH")).toBeUndefined()
  })
})

describe("swap catalog reads the canonical basis (no drift-prone literals)", () => {
  it("prices every non-LP swap asset from the canonical snapshot", () => {
    for (const asset of SWAP_ASSETS) {
      if (asset.isLpToken) continue
      expect(asset.priceUsd).toBe(canonicalPriceUsd(asset.symbol))
    }
  })
})

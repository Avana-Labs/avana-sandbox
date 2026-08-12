import { describe, expect, it } from "vitest"
import {
  buildLendMarketDetail,
  getLendMarketDetail,
  listAllLendMarketDetails,
  resolveLendMarket,
} from "@/app/lib/lend-detail"
import { LEND_MARKET_CATALOG, getLendMarketById } from "@/app/lib/lend-system/catalog"

describe("lend detail contract", () => {
  it("resolves a market by its id and by its asset symbol", () => {
    const byId = getLendMarketDetail("usdc")
    expect(byId?.hero.symbol).toBe("USDC")
    expect(byId?.id).toBe("usdc")

    // Symbol form (uppercase) resolves to the same canonical market.
    const bySymbol = getLendMarketDetail("USDC")
    expect(bySymbol?.id).toBe("usdc")

    // URL-encoded / whitespace-padded ids decode + trim.
    expect(getLendMarketDetail("%20wsteth%20")?.id).toBe("wsteth")

    expect(getLendMarketDetail("not-a-market")).toBeNull()
  })

  it("exposes a detail for every catalog market (exact count)", () => {
    const all = listAllLendMarketDetails()
    expect(all.length).toBe(LEND_MARKET_CATALOG.length)
    expect(all.length).toBeGreaterThan(20)
    // Every catalog market id is renderable.
    for (const market of LEND_MARKET_CATALOG) {
      expect(getLendMarketDetail(market.marketId)?.id).toBe(market.marketId)
    }
  })

  it("produces distinct ids, rows, and hero content per market", () => {
    const usdc = getLendMarketDetail("usdc")
    const wsteth = getLendMarketDetail("wsteth")
    expect(usdc && wsteth).toBeTruthy()
    expect(usdc!.id).not.toBe(wsteth!.id)
    expect(usdc!.row.marketId).not.toBe(wsteth!.row.marketId)
    expect(usdc!.hero.subtitle).not.toBe(wsteth!.hero.subtitle)
    // Stablecoin vs volatile category is reflected in the hero.
    expect(usdc!.hero.category).toBe("stable")
  })

  it("keeps related markets within the lend set and excludes self", () => {
    for (const market of LEND_MARKET_CATALOG.slice(0, 8)) {
      const detail = getLendMarketDetail(market.marketId)!
      expect(detail.related.length).toBeGreaterThan(0)
      for (const rel of detail.related) {
        expect(rel.id).not.toBe(detail.id)
        expect(getLendMarketById(rel.id)).not.toBeNull()
      }
    }
  })

  it("fills every section with well-formed data", () => {
    const detail = getLendMarketDetail("usdc")!
    expect(detail.quickStats.length).toBeGreaterThan(0)
    expect(detail.quickStats.find((s) => s.id === "available")).toBeTruthy()
    expect(detail.quickStats.find((s) => s.id === "supplied")).toBeUndefined()
    expect(detail.quickStats.find((s) => s.id === "borrowed")).toBeUndefined()
    expect(detail.quickStats.find((s) => s.id === "utilization")).toBeUndefined()
    expect(detail.utilizationPct).toBeGreaterThan(0)
    expect(detail.borrowAprPct).toBeGreaterThan(0)
    expect(detail.protocolParameters.map((row) => row.id)).toEqual([
      "optimalUtilization",
      "slopeBelowOptimal",
      "slopeAboveOptimal",
      "baseBorrowRate",
    ])
    expect(detail.supplyBorrow.supplied.points.length).toBeGreaterThan(0)
    expect(detail.supplyBorrow.utilization.points.length).toBeGreaterThan(0)
    expect(detail.cashflow.rows.length).toBeGreaterThan(0)
    expect(detail.cashflow.bars.length).toBeGreaterThan(0)
    expect(detail.risk.breakdown.length).toBeGreaterThan(0)
    expect(detail.risk.metrics.length).toBeGreaterThan(0)
    expect(detail.faqs.length).toBeGreaterThanOrEqual(5)
    expect(detail.transactions.length).toBeGreaterThan(0)
    expect(detail.about.stats.length).toBeGreaterThan(0)
  })

  it("uses contract metadata in the About stats like borrow details", () => {
    const detail = getLendMarketDetail("usdc")!
    expect(detail.about.stats.map((stat) => stat.label)).toEqual([
      "Vault Contract Address",
      "Token Contract Address",
      "Staking Contract Address",
    ])
    expect(detail.about.stats.every((stat) => stat.href?.startsWith("https://etherscan.io/address/"))).toBe(true)
  })

  it("labels a zero incentive APY as no rewards", () => {
    const detail = getLendMarketDetail("eurc")!
    expect(detail.quickStats.find((stat) => stat.id === "rewardsApy")?.value).toBe("No rewards")
  })

  it("is deterministic — same id in, same detail out", () => {
    const a = getLendMarketDetail("usdc")!
    const b = getLendMarketDetail("usdc")!
    expect(a.quickStats).toEqual(b.quickStats)
    expect(a.supplyBorrow.supplied.points).toEqual(b.supplyBorrow.supplied.points)
    expect(a.transactions).toEqual(b.transactions)
  })

  it("overlays Convex reference values onto the headline quick stats", () => {
    const market = getLendMarketById("usdc")!
    const overridden = buildLendMarketDetail(market, {
      suppliedUsd: 123_456_789,
      borrowedUsd: 50_000_000,
      availableUsd: 73_456_789,
      utilizationPct: 40.5,
      supplyApyPct: 7.25,
    })
    const available = overridden.quickStats.find((s) => s.id === "available")
    const supplyApy = overridden.quickStats.find((s) => s.id === "supplyApy")
    expect(available?.value).toBe("$73.5M")
    expect(supplyApy?.value).toBe("7.25%")
  })

  it("resolveLendMarket returns the underlying catalog market", () => {
    const market = resolveLendMarket("usdc")
    expect(market?.asset.symbol).toBe("USDC")
    expect(resolveLendMarket("")).toBeNull()
  })
})

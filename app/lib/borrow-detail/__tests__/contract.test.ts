import { describe, expect, it } from "vitest"
import { getAssetDetail, getPoolDetail, listAllAssetDetails, listAllPoolDetails } from "@/app/lib/borrow-detail"
import { resolveHeroContractLabel } from "@/app/borrow/_detail/lib/hero-chart-feeds"

describe("borrow detail contract", () => {
  it("uses the lend headline set for borrow pool key statistics", () => {
    const detail = getPoolDetail("uni-v3-bluechip-weth-usdc")!
    expect(detail.quickStats.map((stat) => stat.id)).toEqual([
      "price",
      "available",
      "supplyApy",
      "rewardsApy",
      "borrowApy",
      "reserveFactor",
    ])
    expect(detail.about.governanceParameters?.parameters[0]?.label).toBe("Max LTV")
  })

  it("always exposes a lend-style hero contract address for borrow pools", () => {
    const curated = getPoolDetail("uni-v3-bluechip-weth-usdc")!
    const v2 = getPoolDetail("uni-v2-weth-usdt")!
    expect(curated.hero.explorerUrl).toMatch(/0x[a-fA-F0-9]{40}/)
    expect(v2.hero.explorerUrl).toMatch(/0x[a-fA-F0-9]{40}/)
    expect(resolveHeroContractLabel(curated.id, curated.hero.explorerUrl)).toMatch(
      /^0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}$/,
    )
    expect(resolveHeroContractLabel(v2.id, v2.hero.explorerUrl)).toMatch(/^0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}$/)
  })

  it("resolves canonical and home-alias pool ids from the canonical borrow system", () => {
    expect(getPoolDetail("uni-v3-bluechip-weth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(getPoolDetail("eth-usdc")?.hero.name).toBe("WETH / USDC")
    expect(listAllPoolDetails().length).toBeGreaterThan(5)
  })

  it("resolves spoke-bound borrowable detail pages as distinct product records", () => {
    const uniUsdc = getAssetDetail("uni-v3-stable:usdc")
    const curveUsdc = getAssetDetail("curve-stable:usdc")

    expect(uniUsdc?.hero.symbol).toBe("USDC")
    expect(curveUsdc?.hero.symbol).toBe("USDC")
    expect(uniUsdc?.id).toBe("uni-v3-stable:usdc")
    expect(curveUsdc?.id).toBe("curve-stable:usdc")
    expect(uniUsdc?.hero.subtitle).not.toBe(curveUsdc?.hero.subtitle)
    expect(uniUsdc?.row.id).not.toBe(curveUsdc?.row.id)
    expect(uniUsdc?.related.every((asset) => asset.id.startsWith("uni-v3-stable:"))).toBe(true)
    expect(curveUsdc?.related.every((asset) => asset.id.startsWith("curve-stable:"))).toBe(true)
    expect(listAllAssetDetails().length).toBe(64)
  })

  it("resolves URL-encoded spoke asset route params", () => {
    expect(getAssetDetail("uni-v2%3Adai")?.hero.symbol).toBe("DAI")
    expect(getAssetDetail("uni-v2%3Adai")?.id).toBe("uni-v2:dai")
  })

  it("uses the lend headline set for borrowable asset key statistics", () => {
    const detail = getAssetDetail("uni-v3-stable:usdc")!
    expect(detail.quickStats.map((stat) => stat.id)).toEqual([
      "price",
      "available",
      "supplyApy",
      "rewardsApy",
      "borrowApy",
      "reserveFactor",
    ])
    expect(detail.quickStats.find((stat) => stat.id === "supplied")).toBeUndefined()
    expect(detail.quickStats.find((stat) => stat.id === "dexLiquidity")).toBeUndefined()
    expect(detail.quickStats.find((stat) => stat.id === "utilization")).toBeUndefined()
  })

  it("fills six lend-style risk parameters on every borrow pool", () => {
    const labels = [
      "Max LTV",
      "Liquidation threshold",
      "Supply cap",
      "Borrow cap",
      "Liquidation bonus",
      "Oracle source",
    ]
    for (const detail of listAllPoolDetails()) {
      expect(detail.about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual(labels)
      expect(detail.about.governanceParameters?.parameters.every((parameter) => parameter.value.length > 0)).toBe(true)
    }
  })

  it("uses lend-style risk parameters instead of the interest-rate model", () => {
    const detail = getAssetDetail("uni-v3-stable:usdc")!
    expect(detail.about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual([
      "Max LTV",
      "Liquidation threshold",
      "Supply cap",
      "Borrow cap",
      "Liquidation bonus",
      "Oracle source",
    ])
    expect(detail.about.governanceParameters?.changelog.length).toBeGreaterThan(0)
    expect(detail.about.stats.map((stat) => stat.label)).toEqual([
      "Vault Contract Address",
      "Token Contract Address",
      "Staking Contract Address",
    ])
  })
})

import { describe, expect, it } from "vitest"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { resolveHeroContractLabel } from "@/app/borrow/_detail/lib/hero-chart-feeds"

describe("multiply detail about contract", () => {
  it("uses a lend-style copyable contract address in the hero", () => {
    const detail = getMultiplyMarketDetail("crvusd-usdt")!
    expect(detail.hero.venue).toBe("Avana Multiply")
    expect(detail.hero.explorerUrl).toMatch(/^https:\/\/etherscan\.io\/address\/0x[a-fA-F0-9]{40}$/)
    expect(resolveHeroContractLabel(detail.id, detail.hero.explorerUrl)).toMatch(/^0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}$/)
  })

  it("uses contract metadata in the About stats like lend details", () => {
    const detail = getMultiplyMarketDetail("aave-gho")!
    expect(detail.about.stats.map((stat) => stat.label)).toEqual([
      "Vault Contract Address",
      "Token Contract Address",
      "Staking Contract Address",
    ])
    expect(detail.about.stats.every((stat) => stat.href?.startsWith("https://etherscan.io/address/"))).toBe(true)
    expect(detail.about.stats.every((stat) => /\.\.\./.test(stat.value))).toBe(true)
  })

  it("uses lend-style key statistics and risk parameters", () => {
    const detail = getMultiplyMarketDetail("aave-gho")!
    expect(detail.quickStats.map((stat) => stat.label)).toEqual([
      "Price",
      "Available Liquidity",
      "Supply APY",
      "Rewards APY",
      "Borrow APY",
      "Reserve Factor",
    ])
    expect(detail.about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual([
      "Max LTV",
      "Liquidation threshold",
      "Supply cap",
      "Borrow cap",
      "Liquidation bonus",
      "Oracle source",
    ])
    expect(detail.about.governanceParameters?.changelog.length).toBeGreaterThan(0)
  })
})

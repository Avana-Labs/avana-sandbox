import { describe, expect, it } from "vitest"
import { getMultiplyMarketDetail } from "@/app/lib/multiply-detail"
import { resolveHeroContractLabel } from "@/app/borrow/_detail/lib/hero-chart-feeds"

describe("multiply detail about contract", () => {
  it("uses a lend-style copyable contract address in the hero", () => {
    const detail = getMultiplyMarketDetail("crvusd-usdt")!
    expect(detail.hero.venue).toBe("Avana Multiply")
    expect(detail.hero.explorerUrl).toMatch(/^https:\/\/etherscan\.io\/address\/0x[a-fA-F0-9]{40}$/)
    expect(resolveHeroContractLabel(detail.id, detail.hero.explorerUrl)).toMatch(
      /^0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}$/,
    )
  })

  it("mock builder yields empty About stats — contract rows injected by Convex overlay", () => {
    // Contract-address stats are no longer baked into the mock builder. The three
    // vault/token/riskManager/oracleRouter rows land in about.stats at Convex overlay time, via
    // getMultiplyMarketDetailFromConvex + api.contractAddresses.listMultiplyAddresses.
    // Verify the mock stays empty here so a regression that re-adds mock rows fails.
    const detail = getMultiplyMarketDetail("aave-gho")!
    expect(detail.about.stats).toEqual([])
  })

  it("uses lend-style key statistics and risk parameters", () => {
    const detail = getMultiplyMarketDetail("aave-gho")!
    expect(detail.quickStats.map((stat) => stat.label)).toEqual([
      "Price",
      "Available Liquidity",
      "Max loop APY",
      "Supply APY",
      "Rewards APY",
      "Borrow APY",
      "Reserve Factor",
    ])
    // E7: the detail surfaces the SAME leveraged loop APY the trending card advertises
    // (economics.estimatedMaxApy), not just the base supply APY.
    const loopStat = detail.quickStats.find((stat) => stat.label === "Max loop APY")!
    expect(loopStat.value).toBe("10.56%")
    expect(detail.about.governanceParameters?.parameters.map((parameter) => parameter.label)).toEqual([
      "Collateral factor",
      "Collateral risk",
      "Deposit capacity",
      "Liquidation penalty",
      "Borrow capacity",
      "Target health factor",
      "Liquidation threshold",
      "Oracle source",
    ])
    expect(detail.about.governanceParameters?.changelog.length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from "vitest"
import { aggregateSymbolExposure, normalizeSymbol } from "@/app/lib/portfolio/exposure-aggregator"
import type { PortfolioLendTabData, PortfolioMultiplyTabData } from "@/app/lib/data/providers/portfolio"
import type { DebtRowContext, SupplyRowContext } from "@/app/lib/data/borrow-position-types"

function pool(symbols: [string, string], collateralUsd: number, name = symbols.join("/")) {
  const visual = (symbol: string) => ({
    symbol,
    shortLabel: symbol,
    bgClassName: "",
    textClassName: "",
  })
  return {
    id: `${symbols[0]}-${symbols[1]}`,
    name,
    venue: "test",
    category: "test",
    collateralUsd,
    maxLtv: 0.8,
    borrowPowerUsd: collateralUsd * 0.5,
    liquidationUsd: collateralUsd * 0.85,
    pairApr: 0.05,
    visuals: [visual(symbols[0]), visual(symbols[1])] as [ReturnType<typeof visual>, ReturnType<typeof visual>],
  }
}

describe("aggregateSymbolExposure", () => {
  it("uppercases token symbols so casing variants bucket together", () => {
    const lend: PortfolioLendTabData = {
      investments: [
        {
          id: "1",
          symbol: "usdc",
          name: "USDC",
          balance: 100,
          priceUsd: 1,
          suppliedUsd: 50,
          earnedUsd: 0,
          dailyEarnedUsd: 0,
          apyPct: 3,
        },
        {
          id: "2",
          symbol: "USDC ",
          name: "USDC",
          balance: 100,
          priceUsd: 1,
          suppliedUsd: 25,
          earnedUsd: 0,
          dailyEarnedUsd: 0,
          apyPct: 3,
        },
      ],
      positions: [],
      strategyBuckets: [],
      history: [],
    }
    const rows = aggregateSymbolExposure({ lend })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.symbol).toBe("USDC")
    expect(rows[0]!.longUsd).toBe(75)
  })

  it("splits LP-pair borrow collateral 50/50 across its two legs", () => {
    const collateral: SupplyRowContext[] = [
      {
        pool: pool(["USDC", "WETH"], 400),
        borrowedUsd: 0,
        remainingBorrowPowerUsd: 200,
        liquidationThresholdUsd: 340,
        healthFactor: Number.POSITIVE_INFINITY,
        pairApr: 0.02,
        feesUsd: 0,
        feesLabel: "",
      },
    ]
    const rows = aggregateSymbolExposure({ borrowCollateral: collateral })
    const usdc = rows.find((r) => r.symbol === "USDC")
    const weth = rows.find((r) => r.symbol === "WETH")
    expect(usdc?.longUsd).toBe(200)
    expect(weth?.longUsd).toBe(200)
  })

  it("nets a debt against a same-symbol collateral", () => {
    const collateral: SupplyRowContext[] = [
      {
        pool: pool(["USDC", "WETH"], 200),
        borrowedUsd: 0,
        remainingBorrowPowerUsd: 100,
        liquidationThresholdUsd: 170,
        healthFactor: Number.POSITIVE_INFINITY,
        pairApr: 0.02,
        feesUsd: 0,
        feesLabel: "",
      },
    ]
    const debt: DebtRowContext[] = [
      {
        id: "d1",
        pool: pool(["USDC", "WETH"], 200),
        debtAssetSymbol: "USDC",
        borrowedUsd: 50,
        liquidationThresholdUsd: 170,
        healthFactor: 2.5,
        borrowApr: 0.04,
        accruedInterestUsd: 0.1,
        dailyInterestUsd: 0.01,
      },
    ]
    const rows = aggregateSymbolExposure({ borrowCollateral: collateral, borrowDebt: debt })
    const usdc = rows.find((r) => r.symbol === "USDC")
    // Long: 100 from LP-collateral leg. Short: 50 from debt. Net: 50.
    expect(usdc?.longUsd).toBe(100)
    expect(usdc?.shortUsd).toBe(50)
    expect(usdc?.netUsd).toBe(50)
  })

  it("aggregates multiply collateral + debt into the two asset symbols", () => {
    const multiply: PortfolioMultiplyTabData = {
      creditLines: {
        approvedUsd: 0,
        liquidationThresholdUsd: 0,
        averageHealthFactor: null,
        currentLtvPct: 0,
        totalBorrowedUsd: 0,
        totalCollateralUsd: 0,
      },
      lpCollaterals: [
        {
          id: "m1",
          marketId: "eth-usdt",
          label: "ETH/USDT",
          collateralToken: "ETH",
          borrowableToken: "USDT",
          multiplier: 2,
          protocol: "test",
          healthFactor: 1.6,
          collateralUsd: 3000,
          borrowPowerUsd: 1500,
          debtUsd: 1500,
          ltvPct: 50,
          liquidationPriceUsd: 1400,
          netApyPct: 3,
          status: "open",
        },
      ],
      positions: [],
      openOrders: [],
      twapOrders: [],
      history: [],
    }
    const rows = aggregateSymbolExposure({ multiply })
    const eth = rows.find((r) => r.symbol === "ETH")
    const usdt = rows.find((r) => r.symbol === "USDT")
    expect(eth?.longUsd).toBe(3000)
    expect(usdt?.shortUsd).toBe(1500)
  })

  it("counts umbrella stake + pending rewards as long exposure in the staked asset", () => {
    const rows = aggregateSymbolExposure({
      umbrella: [{ symbol: "USDC", valueUsd: 500, pendingRewardsUsd: 25 }],
    })
    const usdc = rows.find((r) => r.symbol === "USDC")
    expect(usdc?.longUsd).toBe(525)
  })

  it("sorts rows by total exposure (long + short) descending", () => {
    const rows = aggregateSymbolExposure({
      umbrella: [
        { symbol: "GHO", valueUsd: 100, pendingRewardsUsd: 0 },
        { symbol: "USDC", valueUsd: 500, pendingRewardsUsd: 0 },
      ],
    })
    expect(rows.map((r) => r.symbol)).toEqual(["USDC", "GHO"])
  })

  it("skips empty exposure entirely", () => {
    expect(aggregateSymbolExposure({})).toEqual([])
    expect(normalizeSymbol(" ")).toBe("")
  })
})

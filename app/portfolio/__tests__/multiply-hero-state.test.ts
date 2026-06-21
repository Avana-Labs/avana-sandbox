import { describe, expect, it } from "vitest"
import { buildMultiplyHeroData, buildMultiplySnapshotFromTabData } from "@/app/portfolio/multiply-hero-state"

describe("multiply hero state", () => {
  it("builds live hero values from multiply tab data", () => {
    const snapshot = buildMultiplySnapshotFromTabData({
      creditLines: {
        approvedUsd: 12_000,
        liquidationThresholdUsd: 10_200,
        averageHealthFactor: 2.48,
        currentLtvPct: 41.25,
        totalBorrowedUsd: 4_950,
        totalCollateralUsd: 12_000,
      },
      lpCollaterals: [
        {
          id: "position-1",
          marketId: "eth-usdc",
          label: "ETH/USDC",
          collateralToken: "ETH",
          borrowableToken: "USDC",
          multiplier: 2.4,
          protocol: "Avana Multiply",
          healthFactor: 2.48,
          collateralUsd: 12_000,
          borrowPowerUsd: 7_050,
          debtUsd: 4_950,
          ltvPct: 41.25,
          liquidationPriceUsd: 2_400,
          netApyPct: 8.75,
          status: "open",
        },
      ],
      positions: [
        {
          id: "position-1",
          symbol: "ETH",
          label: "ETH/USDC",
          side: "long",
          leverage: 2.4,
          collateralUsd: 12_000,
          exposureUsd: 12_000,
          pnlUsd: 420,
          pnlPct: 8.75,
          status: "open",
        },
      ],
      openOrders: [],
      twapOrders: [],
      history: [],
    })

    expect(snapshot.totalExposureUsd).toBe(12_000)
    expect(snapshot.openPositions).toBe(1)
    expect(snapshot.averageNetCarryPct).toBe(8.75)
    expect(snapshot.rangeData["1D"].at(-1)?.value).toBeGreaterThan(0)

    const hero = buildMultiplyHeroData({}, snapshot)
    expect(hero.headlineValue).toBe("$12,000.00")
    expect(hero.headlineDelta).toBe("2.48 health factor")
    expect(hero.statOneValue).toBe("1")
    expect(hero.statTwoValue).toBe("8.75%")
    expect(hero.rangeData?.["1D"].length).toBeGreaterThan(0)
  })
})

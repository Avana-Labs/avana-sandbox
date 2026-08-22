// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import { marketFreshness } from "./askAITools"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const WALLET_A = "0x00000000000000000000000000000000000000aa"
const WALLET_B = "0x00000000000000000000000000000000000000bb"

async function seedPosition(t: ReturnType<typeof convexTest>, wallet: string, marketSlug: string) {
  return await t.run(async (ctx) =>
    ctx.db.insert("positions", {
      wallet,
      product: "multiply",
      marketSlug,
      assetId: "ETH",
      status: "open",
      collateralValueUsd: 10_000,
      debtValueUsd: 3_500,
      ltv: 0.35,
      healthFactor: 1.857,
      openedAt: 1,
      lastUpdatedAt: 2,
    }),
  )
}

describe("Ask AI authenticated portfolio tools", () => {
  test("returns a wallet-required result for a guest", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.withIdentity({ subject: "ask-guest:test" }).query(api.askAITools.borrowCapacity, {}),
    ).resolves.toMatchObject({
      walletRequired: true,
    })
  })

  test("does not expose another wallet's position", async () => {
    const t = convexTest(schema, modules)
    const ownId = await seedPosition(t, WALLET_A, "eth-usdc")
    const otherId = await seedPosition(t, WALLET_B, "wbtc-usdc")
    const asA = t.withIdentity({ subject: WALLET_A })

    await expect(asA.query(api.askAITools.positionRisk, { positionId: ownId })).resolves.toMatchObject({
      wallet: WALLET_A,
      dataProvenance: "sandbox",
      positions: [expect.objectContaining({ marketSlug: "eth-usdc" })],
    })
    await expect(asA.query(api.askAITools.positionRisk, { positionId: otherId })).rejects.toThrow("Position not found")
  })

  test("simulates the requested borrow amount without mutating the position", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seedPosition(t, WALLET_A, "eth-usdc")
    await t.run(async (ctx) =>
      ctx.db.insert("borrowMarkets", {
        slug: "eth-usdc",
        kind: "pool",
        chainId: 1,
        name: "ETH / USDC",
        symbol: "ETH/USDC",
        maxLtvPct: 55,
        createdAt: 1,
      }),
    )
    const asA = t.withIdentity({ subject: WALLET_A })

    await expect(
      asA.query(api.askAITools.simulateBorrow, {
        positionId,
        additionalBorrowAmount: 1_000,
        borrowAsset: "USDC",
      }),
    ).resolves.toMatchObject({
      dataProvenance: "sandbox",
      additionalBorrowAmount: 1_000,
      simulation: {
        current: { debtValueUsd: 3_500, ltv: 0.35 },
        projected: { debtValueUsd: 4_500, ltv: 0.45 },
        remainingBorrowCapacityUsd: 1_000,
      },
    })
    await expect(t.run(async (ctx) => ctx.db.get(positionId))).resolves.toMatchObject({ debtValueUsd: 3_500 })
  })

  test("stress-tests the owned position with the requested shock", async () => {
    const t = convexTest(schema, modules)
    const positionId = await seedPosition(t, WALLET_A, "eth-usdc")
    await t.run(async (ctx) =>
      ctx.db.insert("multiplyTokenParameters", {
        symbol: "ETH",
        supplyApyPct: 3,
        borrowAprPct: 5,
        availableUsd: 1_000_000,
        collateralFactorPct: 55,
        liquidationThresholdPct: 65,
        iconUrl: "/eth.svg",
        updatedAt: 1,
      }),
    )

    await expect(
      t.withIdentity({ subject: WALLET_A }).query(api.askAITools.stressPosition, {
        positionId,
        assetPriceChanges: [{ symbol: "ETH", change: -0.2 }],
      }),
    ).resolves.toMatchObject({
      dataProvenance: "sandbox",
      simulation: {
        weightedCollateralChange: -0.2,
        projected: { collateralValueUsd: 8_000, debtValueUsd: 3_500 },
      },
    })
  })

  test("stamps sandbox provenance on portfolio and borrow-capacity reads", async () => {
    const t = convexTest(schema, modules)
    await seedPosition(t, WALLET_A, "eth-usdc")
    const asA = t.withIdentity({ subject: WALLET_A })

    await expect(asA.query(api.askAITools.portfolio, {})).resolves.toMatchObject({
      walletRequired: false,
      dataProvenance: "sandbox",
    })
    await expect(asA.query(api.askAITools.borrowCapacity, {})).resolves.toMatchObject({
      walletRequired: false,
      dataProvenance: "sandbox",
    })
    await expect(asA.query(api.askAITools.engineSnapshot, {})).resolves.toMatchObject({
      walletRequired: false,
      dataProvenance: "sandbox",
    })
  })
})

describe("Ask AI normalized market tools", () => {
  test("rejects provider values after their data-kind freshness window", () => {
    const now = 2_000_000
    expect(marketFreshness("token_price", now - 19 * 60_000, now)).toBe("fresh")
    expect(marketFreshness("token_price", now - 21 * 60_000, now)).toBe("stale")
    expect(marketFreshness("dex_pool", now - 31 * 60_000, now)).toBe("stale")
  })

  test("searches canonical markets and labels provider freshness", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert("markets", {
        scope: "pool",
        slug: "eth-usdc",
        chainId: 1,
        name: "ETH / USDC",
        symbol: "ETH/USDC",
        venueLabel: "Uniswap v3",
        createdAt: 1,
      })
      await ctx.db.insert("askAIMarketSnapshots", {
        source: "uniswap",
        kind: "dex_pool",
        key: "eth-usdc",
        payload: { liquidityUsd: 4_000_000, volume24h: 500_000 },
        sourceUpdatedAt: now,
        fetchedAt: now,
      })
      await ctx.db.insert("tokenPrices", {
        symbol: "weth",
        llamaId: "coingecko:ethereum",
        priceUsd: 4_321,
        confidence: 0.99,
        sourceUpdatedAt: now,
        fetchedAt: now,
        snapshotAt: now,
        status: "fresh",
        source: "defillama",
        updatedAt: now,
      })
    })

    await expect(t.query(api.askAITools.searchMarkets, { query: "ETH" })).resolves.toMatchObject({
      markets: [expect.objectContaining({ slug: "eth-usdc" })],
      providerData: expect.arrayContaining([
        expect.objectContaining({
          source: "defillama",
          kind: "token_price",
          key: "weth",
          data: expect.objectContaining({ priceUsd: 4_321 }),
        }),
      ]),
    })
    await expect(t.query(api.askAITools.poolMetrics, { marketId: "eth-usdc" })).resolves.toMatchObject({
      market: expect.objectContaining({ name: "ETH / USDC" }),
      providerData: [expect.objectContaining({ source: "uniswap", freshness: "fresh" })],
    })
  })

  test("ranks the exact cached token quote first for a natural price question", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert("tokenPrices", {
        symbol: "aave",
        llamaId: "coingecko:aave",
        priceUsd: 123.98,
        confidence: 0.99,
        sourceUpdatedAt: now,
        fetchedAt: now,
        snapshotAt: now,
        status: "fresh",
        source: "defillama",
        updatedAt: now,
      })
      await ctx.db.insert("askAIMarketSnapshots", {
        source: "aave",
        kind: "lending_market",
        key: "aave-v3-usdc",
        payload: {
          market: "AaveV3Ethereum",
          name: "Aave token lending market",
          symbol: "USDC",
          sizeUsd: 2_000_000_000,
        },
        sourceUpdatedAt: now,
        fetchedAt: now,
      })
    })

    const result = await t.query(api.askAITools.searchMarkets, { query: "What's Aave token price now?" })
    expect(result.providerData[0]).toMatchObject({
      kind: "token_price",
      key: "aave",
      data: { priceUsd: 123.98 },
    })
  })

  test("maps natural asset names to canonical cached price symbols", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert("tokenPrices", {
        symbol: "btc",
        llamaId: "coingecko:bitcoin",
        priceUsd: 77_856.08,
        confidence: 0.99,
        sourceUpdatedAt: now,
        fetchedAt: now,
        snapshotAt: now,
        status: "fresh",
        source: "defillama",
        updatedAt: now,
      })
      for (const [symbol, priceUsd] of [
        ["wbtc", 77_810],
        ["cbbtc", 77_805],
      ] as const)
        await ctx.db.insert("tokenPrices", {
          symbol,
          llamaId: `coingecko:${symbol}`,
          priceUsd,
          confidence: 0.99,
          sourceUpdatedAt: now,
          fetchedAt: now,
          snapshotAt: now,
          status: "fresh",
          source: "defillama",
          updatedAt: now,
        })
    })

    const result = await t.query(api.askAITools.searchMarkets, { query: "What is Bitcoin's price now?" })
    expect(result.providerData[0]).toMatchObject({
      kind: "token_price",
      key: "btc",
      data: { priceUsd: 77_856.08 },
    })
  })

  test("reads only the indexed requested token and its bounded history", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    await t.run(async (ctx) => {
      for (const [symbol, priceUsd] of [
        ["uni", 7.25],
        ["eth", 2_500],
      ] as const) {
        await ctx.db.insert("tokenPrices", {
          symbol,
          llamaId: `coingecko:${symbol}`,
          priceUsd,
          sourceUpdatedAt: now,
          fetchedAt: now,
          snapshotAt: now,
          status: "fresh",
          source: "defillama",
          updatedAt: now,
        })
        await ctx.db.insert("tokenPricesHistory", {
          symbol,
          day: "2026-08-21",
          priceUsd,
          updatedAt: now,
        })
      }
    })

    const result = await t.query(api.askAITools.searchMarkets, { query: "What's the Uniswap token price?" })
    expect(result.markets).toEqual([])
    expect(result.providerData).toEqual([
      expect.objectContaining({
        key: "uni",
        kind: "token_price",
        history: [{ day: "2026-08-21", priceUsd: 7.25 }],
      }),
    ])
  })
})

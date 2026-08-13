// @vitest-environment edge-runtime
/* eslint-disable @typescript-eslint/no-explicit-any -- convex-test harness */
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "../schema"
import { api } from "../_generated/api"

const modules = import.meta.glob("../**/*.*s")
const SLUG = "uni-v2-weth-usdc"
const WALLET = "0xabc0000000000000000000000000000000000001"

describe("getRecentTransactions prefers sandbox activity", () => {
  test("returns sandbox transactions for the market slug when present", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      const marketId = await ctx.db.insert("markets", {
        scope: "pool",
        slug: SLUG,
        chainId: 1,
        name: "WETH / USDC",
        symbol: "WETH / USDC",
        createdAt: 0,
      })
      await ctx.db.insert("walletEvents", {
        marketId,
        wallet: "0xseed000000000000000000000000000000000001",
        kind: "borrow",
        amountUsd: 99_000,
        at: Date.now() - 86_400_000 * 50,
        txHash: "0xseedhash00000000000000000000000000000001",
        blockNumber: 1,
      })
      await ctx.db.insert("transactions", {
        wallet: WALLET,
        product: "borrow",
        kind: "deposit",
        status: "success",
        marketSlug: SLUG,
        requestedAmountUsd6: "20000000000000",
        executedAmountUsd6: "20000000000000",
        amountUsd: 20_000_000,
        syntheticTxHash: "0xlivehash0000000000000000000000000000001",
        simulated: true,
        at: Date.now(),
      })
    })

    const rows = await t.query(api.markets.getRecentTransactions, {
      scope: "pool",
      slug: SLUG,
      limit: 12,
    })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0]?.source).toBe("sandbox")
    expect(rows[0]?.kind).toBe("supply")
    expect(rows[0]?.amountLabel).toContain("20")
    // Seed walletEvents must not win when sandbox rows exist for this market.
    expect(rows.every((r) => r.source === "sandbox")).toBe(true)
  })

  test("falls back to seeded walletEvents when no sandbox txs exist", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      const marketId = await ctx.db.insert("markets", {
        scope: "pool",
        slug: SLUG,
        chainId: 1,
        name: "WETH / USDC",
        symbol: "WETH / USDC",
        createdAt: 0,
      })
      await ctx.db.insert("walletEvents", {
        marketId,
        wallet: "0xseed000000000000000000000000000000000001",
        kind: "borrow",
        amountUsd: 37_380,
        at: Date.now() - 86_400_000 * 53,
        txHash: "0xseedhash00000000000000000000000000000002",
        blockNumber: 2,
      })
    })

    const rows = await t.query(api.markets.getRecentTransactions, {
      scope: "pool",
      slug: SLUG,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.source).toBe("seed")
    expect(rows[0]?.kind).toBe("borrow")
  })
})

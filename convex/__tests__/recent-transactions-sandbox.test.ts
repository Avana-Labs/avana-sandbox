// @vitest-environment edge-runtime
/* eslint-disable @typescript-eslint/no-explicit-any -- convex-test harness */
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "../schema"
import { api } from "../_generated/api"

const modules = import.meta.glob("../**/*.*s")
const POOL_SLUG = "uni-v2-weth-usdc"
const LEND_SLUG = "gho"
const ASSET_SLUG = "uni-v2:usdc"
const MULTIPLY_SLUG = "wsteth-eth"
const WALLET = "0xabc0000000000000000000000000000000000001"

async function insertMarket(ctx: any, scope: string, slug: string) {
  return ctx.db.insert("markets", {
    scope,
    slug,
    chainId: 1,
    name: slug,
    symbol: slug,
    createdAt: 0,
  })
}

async function insertSandboxTx(ctx: any, slug: string, kind: string, product = "borrow") {
  await ctx.db.insert("transactions", {
    wallet: WALLET,
    product,
    kind,
    status: "success",
    marketSlug: slug,
    requestedAmountUsd6: "1000000000",
    executedAmountUsd6: "1000000000",
    amountUsd: 1_000,
    syntheticTxHash: "0xlivehash0000000000000000000000000000001",
    simulated: true,
    at: Date.now(),
  })
}

describe("getRecentTransactions prefers sandbox activity", () => {
  test("returns sandbox transactions for the market slug when present", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      const marketId = await insertMarket(ctx, "pool", POOL_SLUG)
      await ctx.db.insert("walletEvents", {
        marketId,
        wallet: "0xseed000000000000000000000000000000000001",
        kind: "borrow",
        amountUsd: 99_000,
        at: Date.now() - 86_400_000 * 50,
        txHash: "0xseedhash00000000000000000000000000000001",
        blockNumber: 1,
      })
      await insertSandboxTx(ctx, POOL_SLUG, "deposit")
    })

    const rows = await t.query(api.markets.getRecentTransactions, {
      scope: "pool",
      slug: POOL_SLUG,
      limit: 12,
    })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0]?.source).toBe("sandbox")
    expect(rows[0]?.kind).toBe("supply")
    expect(rows[0]?.amountLabel).toContain("1")
    expect(rows.every((r) => r.source === "sandbox")).toBe(true)
  })

  test("falls back to seeded walletEvents when no sandbox txs exist", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      const marketId = await insertMarket(ctx, "pool", POOL_SLUG)
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
      slug: POOL_SLUG,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.source).toBe("seed")
    expect(rows[0]?.kind).toBe("borrow")
  })

  test("maps lend sandbox deposit/withdraw/claim kinds", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      await insertMarket(ctx, "lend", LEND_SLUG)
      await insertSandboxTx(ctx, LEND_SLUG, "deposit", "lend")
      await insertSandboxTx(ctx, LEND_SLUG, "withdraw", "lend")
      await insertSandboxTx(ctx, LEND_SLUG, "claim", "lend")
    })

    const rows = await t.query(api.markets.getRecentTransactions, { scope: "lend", slug: LEND_SLUG, limit: 12 })
    const kinds = rows.map((row) => row.kind)
    expect(kinds).toContain("supply")
    expect(kinds).toContain("withdraw")
    expect(kinds).toContain("rewards")
  })

  test("maps asset sandbox borrow/repay kinds", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      await insertMarket(ctx, "asset", ASSET_SLUG)
      await insertSandboxTx(ctx, ASSET_SLUG, "borrow")
      await insertSandboxTx(ctx, ASSET_SLUG, "repay")
    })

    const rows = await t.query(api.markets.getRecentTransactions, { scope: "asset", slug: ASSET_SLUG, limit: 12 })
    const kinds = rows.map((row) => row.kind)
    expect(kinds).toContain("borrow")
    expect(kinds).toContain("repay")
  })

  test("maps multiply sandbox kinds to multiply detail kinds", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx: any) => {
      await insertMarket(ctx, "multiply", MULTIPLY_SLUG)
      await insertSandboxTx(ctx, MULTIPLY_SLUG, "multiply", "multiply")
      await insertSandboxTx(ctx, MULTIPLY_SLUG, "deleverage", "multiply")
      await insertSandboxTx(ctx, MULTIPLY_SLUG, "close", "multiply")
    })

    const rows = await t.query(api.markets.getRecentTransactions, {
      scope: "multiply",
      slug: MULTIPLY_SLUG,
      limit: 12,
    })
    const kinds = rows.map((row) => row.kind)
    expect(kinds).toContain("open")
    expect(kinds).toContain("reduce")
    expect(kinds).toContain("close")
  })

  test("returns empty array when market slug is unknown", async () => {
    const t = convexTest(schema, modules)
    const rows = await t.query(api.markets.getRecentTransactions, {
      scope: "asset",
      slug: "unknown-market-slug",
    })
    expect(rows).toEqual([])
  })
})

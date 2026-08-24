// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import { internal } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("./**/*.*s")
const WALLET = "0xabc0000000000000000000000000000000000001"

describe("sandbox balance migration", () => {
  test("dry-runs by default, inserts missing ledger rows, and is idempotent", async () => {
    const t = convexTest(schema, modules)
    await t.run((ctx) =>
      ctx.db.insert("sandboxBalances", {
        wallet: WALLET,
        assetSlug: "usdc",
        symbol: "USDC",
        amount: 250,
        valueUsd: 250,
        priceUsd: 1,
        updatedAt: 100,
      }),
    )

    const dryRun = await t.mutation(internal.wallet.balanceMigrations.migrateSandboxBalancePage, {})
    expect(dryRun).toMatchObject({ scanned: 1, dryRun: true, walletBalancesInserted: 0, liquidBalancesInserted: 0 })

    const migrated = await t.mutation(internal.wallet.balanceMigrations.migrateSandboxBalancePage, { execute: true })
    expect(migrated).toMatchObject({ walletBalancesInserted: 1, liquidBalancesInserted: 1, conflicts: [] })
    const rerun = await t.mutation(internal.wallet.balanceMigrations.migrateSandboxBalancePage, { execute: true })
    expect(rerun).toMatchObject({ walletBalancesInserted: 0, liquidBalancesInserted: 0, alreadyCovered: 2 })
  })

  test("reports an existing target conflict without overwriting it", async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert("sandboxBalances", {
        wallet: WALLET,
        assetSlug: "weth",
        symbol: "WETH",
        amount: 1,
        valueUsd: 2_000,
        priceUsd: 2_000,
        updatedAt: 100,
      })
      await ctx.db.insert("walletLiquidBalances", {
        wallet: WALLET,
        assetId: "weth",
        symbol: "WETH",
        amount: 2,
        valueUsd: 4_000,
        state: "available",
        updatedAt: 200,
      })
    })

    const result = await t.mutation(internal.wallet.balanceMigrations.migrateSandboxBalancePage, { execute: true })
    expect(result.conflicts).toEqual([
      expect.objectContaining({ assetId: "weth", table: "walletLiquidBalances", targetUpdatedAt: 200 }),
    ])
    const liquid = await t.run((ctx) => ctx.db.query("walletLiquidBalances").first())
    expect(liquid?.amount).toBe(2)
  })
})

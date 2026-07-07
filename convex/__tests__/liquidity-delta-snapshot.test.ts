// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "../schema"
import { api, internal } from "../_generated/api"

const modules = import.meta.glob("../**/*.*s")

const WALLET = "0xAbC0000000000000000000000000000000000001"

function borrowIntent(intentId: string) {
  return {
    wallet: WALLET,
    intentId,
    product: "borrow" as const,
    kind: "borrow",
    assetId: "uni-v2:usdc",
    marketSlug: "uni-v3-bluechip-weth-usdc",
    requestedAmountUsd6: "1000000000",
    executedAmountUsd6: "1000000000",
    amountUsd: 1000,
    simulated: true,
  }
}

async function insertSnapshotRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  rows: Array<{ marketSlug: string; borrowedDeltaUsd: number; suppliedDeltaUsd: number; updatedAt: number }>,
  updatedAt: number,
) {
  await t.run(async (ctx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    await ctx.db.insert("liquidityDeltasCache", {
      singleton: "deltas",
      rows,
      updatedAt,
    })
  })
}

describe("listDeltaSnapshot decouples the app-wide read from the hot write path (M33)", () => {
  test("rebuildDeltaSnapshot is internal-only", () => {
    // @ts-expect-error rebuildDeltaSnapshot must not be publicly callable
    void api.liquidity.rebuildDeltaSnapshot
    expect(internal.liquidity.rebuildDeltaSnapshot).toBeDefined()
  })

  test("a write updates the raw event fold but NOT the snapshot until it is rebuilt", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    // Seed the snapshot cache empty so the app-wide subscription reads the cache doc
    // (not the cold-cache fold fallback).
    await t.mutation(internal.liquidity.rebuildDeltaSnapshot, {})
    expect(await t.query(api.liquidity.listDeltaSnapshot)).toEqual([])

    // A user's action appends to the append-only ledger.
    await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1"))

    // The raw fold reflects it immediately...
    const raw = await t.query(api.liquidity.listDeltas)
    expect(raw.find((r) => r.marketSlug === "uni-v2:usdc")?.borrowedDeltaUsd).toBe(1000)

    // ...but the app-wide snapshot subscription is UNCHANGED (still the last-built cache),
    // so this write did not invalidate every subscriber's read.
    expect(await t.query(api.liquidity.listDeltaSnapshot)).toEqual([])

    // The scheduled rebuild folds the events into the snapshot.
    const res = await t.mutation(internal.liquidity.rebuildDeltaSnapshot, {})
    expect(res.markets).toBe(1)
    const snap = await t.query(api.liquidity.listDeltaSnapshot)
    expect(snap.find((r) => r.marketSlug === "uni-v2:usdc")?.borrowedDeltaUsd).toBe(1000)
  })

  test("cold cache (never built) folds the raw events so the app still hydrates", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1"))
    // No rebuild has run — the snapshot query falls back to folding the raw events.
    const snap = await t.query(api.liquidity.listDeltaSnapshot)
    expect(snap.find((r) => r.marketSlug === "uni-v2:usdc")?.borrowedDeltaUsd).toBe(1000)
  })

  test("snapshot query tolerates duplicate singleton rows by serving the newest cache", async () => {
    const t = convexTest(schema, modules)

    await insertSnapshotRow(
      t,
      [{ marketSlug: "stale-market", borrowedDeltaUsd: 10, suppliedDeltaUsd: 0, updatedAt: 100 }],
      100,
    )
    await insertSnapshotRow(
      t,
      [{ marketSlug: "fresh-market", borrowedDeltaUsd: 20, suppliedDeltaUsd: 0, updatedAt: 200 }],
      200,
    )

    const snap = await t.query(api.liquidity.listDeltaSnapshot)
    expect(snap).toEqual([{ marketSlug: "fresh-market", borrowedDeltaUsd: 20, suppliedDeltaUsd: 0, updatedAt: 200 }])
  })

  test("rebuildDeltaSnapshot heals duplicate singleton rows back to one canonical cache doc", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })

    await insertSnapshotRow(
      t,
      [{ marketSlug: "stale-market", borrowedDeltaUsd: 10, suppliedDeltaUsd: 0, updatedAt: 100 }],
      100,
    )
    await insertSnapshotRow(
      t,
      [{ marketSlug: "older-market", borrowedDeltaUsd: 15, suppliedDeltaUsd: 0, updatedAt: 150 }],
      150,
    )

    await asUser.mutation(api.sandbox.transactions.recordTransaction, borrowIntent("i1"))
    const res = await t.mutation(internal.liquidity.rebuildDeltaSnapshot, {})
    expect(res.markets).toBe(1)

    const cacheDocs = await t.run(async (ctx: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
      ctx.db
        .query("liquidityDeltasCache")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_singleton", (q: any) => q.eq("singleton", "deltas"))
        .collect(),
    )
    expect(cacheDocs).toHaveLength(1)
    expect(cacheDocs[0].rows).toEqual([
      { marketSlug: "uni-v2:usdc", borrowedDeltaUsd: 1000, suppliedDeltaUsd: 0, updatedAt: expect.any(Number) },
    ])
  })
})

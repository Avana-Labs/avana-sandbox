// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

// Rooted at the convex directory so convex-test can resolve module imports.
const modules = import.meta.glob("./**/*.*s")

const DAY_MS = 86_400_000

/** A distinct EVM address for index `n`. */
const wallet = (n: number) => `0x${(n + 1).toString(16).padStart(40, "0")}`

describe("engagement headline uses the last COMPLETE day, not today", () => {
  test("active wallets is non-zero when events end yesterday and today is empty", async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    // Anchor at the last complete UTC day (yesterday) and the day before it.
    const yesterday = now - DAY_MS
    const dayBefore = now - 2 * DAY_MS

    const marketId = await t.run(async (ctx) =>
      ctx.db.insert("markets", {
        scope: "pool",
        slug: "eth-usdc",
        chainId: 1,
        name: "ETH / USDC",
        symbol: "ETH/USDC",
        createdAt: 0,
      }),
    )

    await t.run(async (ctx) => {
      const insert = (w: string, at: number) =>
        ctx.db.insert("walletEvents", {
          marketId,
          wallet: w.toLowerCase(),
          kind: "supply",
          amountUsd: 1000,
          txHash: `0x${at.toString(16)}`,
          blockNumber: 1,
          at,
        })
      // 3 distinct wallets active on the last complete day (yesterday).
      await insert(wallet(0), yesterday)
      await insert(wallet(1), yesterday)
      await insert(wallet(2), yesterday)
      // 2 distinct wallets active the day before (delta baseline).
      await insert(wallet(0), dayBefore)
      await insert(wallet(1), dayBefore)
      // Intentionally NO events for the current (partial) day.
    })

    const result = await t.query(api.engagement.getForPool, { slug: "eth-usdc" })
    expect(result).not.toBeNull()

    // Headline reflects the last complete day (3), never today's empty bucket (0).
    expect(result!.primary.valueLabel).toBe("3")
    // Delta is computed against the complete prior day: (3-2)/2 = +50.0%.
    expect(result!.primary.delta.direction).toBe("up")
    expect(result!.primary.delta.label).toBe("+50.0%")

    // The series' final point is the last complete day and must match the headline.
    const points = result!.series.points
    expect(points[points.length - 1]!.v).toBe(3)
    expect(points[points.length - 2]!.v).toBe(2)
  })
})

// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")

describe("rateLimits.consume — bounds + counting", () => {
  test("allows hits up to the limit, then blocks", async () => {
    const t = convexTest(schema, modules)
    const first = await t.mutation(api.rateLimits.consume, { key: "k1", limit: 2, windowMs: 60_000 })
    const second = await t.mutation(api.rateLimits.consume, { key: "k1", limit: 2, windowMs: 60_000 })
    const third = await t.mutation(api.rateLimits.consume, { key: "k1", limit: 2, windowMs: 60_000 })
    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
  })

  test("rejects an out-of-bounds limit", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.rateLimits.consume, { key: "k2", limit: 1_000_000, windowMs: 60_000 })).rejects.toThrow(
      /INVALID_RATE_LIMIT/,
    )
  })

  test("rejects an out-of-bounds window", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.rateLimits.consume, { key: "k3", limit: 10, windowMs: 7 * 24 * 60 * 60 * 1000 }),
    ).rejects.toThrow(/INVALID_RATE_LIMIT/)
  })

  test("rejects an oversized key", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.rateLimits.consume, { key: "x".repeat(200), limit: 10, windowMs: 60_000 }),
    ).rejects.toThrow(/INVALID_RATE_LIMIT/)
  })

  test("rejects an empty key", async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.rateLimits.consume, { key: "", limit: 10, windowMs: 60_000 })).rejects.toThrow(
      /INVALID_RATE_LIMIT/,
    )
  })

  test("fail-open when no secret is configured (default deploys keep working)", async () => {
    const t = convexTest(schema, modules)
    // No CONVEX_RATE_LIMIT_SECRET set -> a call without a secret is accepted.
    const res = await t.mutation(api.rateLimits.consume, { key: "k4", limit: 5, windowMs: 60_000 })
    expect(res.allowed).toBe(true)
  })
})

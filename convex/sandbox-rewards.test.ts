// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import schema from "./schema"
import { api } from "./_generated/api"

const modules = import.meta.glob("./**/*.*s")
const WALLET = "0xAbC0000000000000000000000000000000000001"
const OTHER = "0xAbC0000000000000000000000000000000000002"

describe("sandbox rewards state", () => {
  test("persists and rehydrates only for the authenticated owner", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.rewards.saveState, {
      wallet: WALLET,
      stateJson: JSON.stringify({ events: [], claims: [] }),
    })

    const state = await asUser.query(api.sandbox.rewards.getState, { wallet: WALLET })
    expect(JSON.parse(state?.stateJson ?? "{}")).toEqual({ events: [], claims: [] })

    await expect(
      t.withIdentity({ subject: OTHER }).query(api.sandbox.rewards.getState, { wallet: WALLET }),
    ).rejects.toThrow(/WALLET_MISMATCH/)
  })

  test("rejects malformed state without creating a row", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await expect(
      asUser.mutation(api.sandbox.rewards.saveState, { wallet: WALLET, stateJson: "not-json" }),
    ).rejects.toThrow(/INVALID_REWARDS_STATE/)
    expect(await asUser.query(api.sandbox.rewards.getState, { wallet: WALLET })).toBeNull()
  })
})

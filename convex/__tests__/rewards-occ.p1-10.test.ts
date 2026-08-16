// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import schema from "../schema"
import { api } from "../_generated/api"

const modules = import.meta.glob("../**/*.*s")
const WALLET = "0xAbC0000000000000000000000000000000000001"

describe("sandbox rewards OCC", () => {
  it("p1-10: saveState requires expectedRevision when a row already exists", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.rewards.saveState, {
      wallet: WALLET,
      stateJson: JSON.stringify({ events: [], claims: [] }),
    })

    await expect(
      asUser.mutation(api.sandbox.rewards.saveState, {
        wallet: WALLET,
        stateJson: JSON.stringify({ events: [{ id: "e1" }], claims: [] }),
      }),
    ).rejects.toThrow(/REVISION_REQUIRED/)
  })

  it("p1-10: saveState reports stale expectedRevision without overwriting", async () => {
    const t = convexTest(schema, modules)
    const asUser = t.withIdentity({ subject: WALLET })
    await asUser.mutation(api.sandbox.rewards.saveState, {
      wallet: WALLET,
      stateJson: JSON.stringify({ events: [], claims: [] }),
    })

    await asUser.mutation(api.sandbox.rewards.saveState, {
      wallet: WALLET,
      expectedRevision: 0,
      stateJson: JSON.stringify({ events: [{ id: "e1" }], claims: [] }),
    })

    const result = await asUser.mutation(api.sandbox.rewards.saveState, {
      wallet: WALLET,
      expectedRevision: 0,
      stateJson: JSON.stringify({ events: [{ id: "e2" }], claims: [] }),
    })
    expect(result).toMatchObject({ revision: 1, stale: true })

    const state = await asUser.query(api.sandbox.rewards.getState, { wallet: WALLET })
    expect(JSON.parse(state?.stateJson ?? "{}")).toEqual({ events: [{ id: "e1" }], claims: [] })
  })
})
